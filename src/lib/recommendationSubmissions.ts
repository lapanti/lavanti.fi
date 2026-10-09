/**
 * Server logic for the recommendation form (`POST /api/suosittele`) and the private inbox the
 * `npm run recommendations` CLI reads (spec: .agents/specs/recommendations/submission-form.md).
 * The Pages Functions in `functions/api/suosittele*` are thin wrappers around these handlers.
 *
 * Data rules:
 * - A submission is a D1 row plus one R2 object keyed by the row id. Nothing is public until
 *   the approve command copies it into a PR; approve and reject delete both.
 * - Rows hold only what the form asks for plus the consent time. No IP, user agent or email.
 * - The stats endpoint returns the pending count only.
 */

import {
    backToForm,
    type D1Like,
    errorMessage,
    type FetchLike,
    hasBearer,
    json,
    redirect,
    text,
    verifyTurnstile,
} from './formHandling'

/** Minimal R2 surface used here, so no Workers type package is needed. */
export interface R2Like {
    delete(key: string): Promise<void>
    get(key: string): Promise<null | { body: ReadableStream; httpMetadata?: { contentType?: string } }>
    put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>
}

export interface RecommendationEnv {
    DB?: D1Like
    LIITY_STATS_TOKEN?: string
    RECOMMENDATION_PHOTOS?: R2Like
    RECOMMENDATIONS_TOKEN?: string
    TURNSTILE_SECRET?: string
}

/** Bump when the consent wording on the form or in the privacy notice changes. */
const CONSENT_VERSION = '2026-10'

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024

const FORM_PATH = '/fi/suosittele/'
const THANKS_PATH = '/fi/suosittele/kiitos/'
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export type PhotoType = 'image/jpeg' | 'image/png' | 'image/webp'

/** The type the bytes actually are; the browser-sent Content-Type is not trusted. */
export const sniffPhotoType = (bytes: Uint8Array): null | PhotoType => {
    const at = (i: number, ...xs: number[]) => xs.every((x, j) => bytes[i + j] === x)
    if (at(0, 0xff, 0xd8, 0xff)) return 'image/jpeg'
    if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png'
    // RIFF....WEBP
    if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return 'image/webp'

    return null
}

interface SubmissionRow {
    consent_at: string
    consent_version: string
    created_at: string
    name: string
    photo_type: PhotoType
    recommendation: string
    title_en: null | string
    title_fi: string
    title_sv: null | string
}

export type ParseResult = { error: string; ok: false } | { ok: true; photo: ArrayBuffer; row: SubmissionRow }

const inRange = (v: string, min: number, max: number) => v.length >= min && v.length <= max

/** Validates the posted form. Never echoes input back; the error is a code. */
export const parseSubmission = async (form: FormData, now: Date): Promise<ParseResult> => {
    if (text(form, 'website') !== '') return { error: 'honeypot', ok: false }

    const name = text(form, 'name')
    if (!inRange(name, 2, 100)) return { error: 'name', ok: false }

    const titleFi = text(form, 'title_fi')
    if (!inRange(titleFi, 2, 100)) return { error: 'title_fi', ok: false }
    const titleSv = text(form, 'title_sv')
    if (titleSv.length > 100) return { error: 'title_sv', ok: false }
    const titleEn = text(form, 'title_en')
    if (titleEn.length > 100) return { error: 'title_en', ok: false }

    const recommendation = text(form, 'recommendation')
    if (!inRange(recommendation, 20, 800)) return { error: 'recommendation', ok: false }

    const file = form.get('photo')
    if (!(file instanceof Blob) || file.size === 0 || file.size > MAX_PHOTO_BYTES) {
        return { error: 'photo', ok: false }
    }
    const photo = await file.arrayBuffer()
    const photoType = sniffPhotoType(new Uint8Array(photo, 0, Math.min(12, photo.byteLength)))
    if (!photoType) return { error: 'photo', ok: false }

    if (text(form, 'consent') !== 'yes') return { error: 'consent', ok: false }

    const iso = now.toISOString()

    return {
        ok: true,
        photo,
        row: {
            consent_at: iso,
            consent_version: CONSENT_VERSION,
            created_at: iso,
            name,
            photo_type: photoType,
            recommendation,
            title_en: titleEn === '' ? null : titleEn,
            title_fi: titleFi,
            title_sv: titleSv === '' ? null : titleSv,
        },
    }
}

const photoKey = (id: string) => `submissions/${id}`

/** POST /api/suosittele — form post in, 303 to the thank-you page or back to the form. */
export const handleSubmit = async (
    request: Request,
    env: RecommendationEnv,
    fetchFn: FetchLike,
    now = new Date(),
    newId: () => string = () => crypto.randomUUID()
): Promise<Response> => {
    const origin = new URL(request.url).origin
    const back = backToForm(origin, FORM_PATH)
    let form: FormData
    try {
        form = await request.formData()
    } catch {
        return back('lomake')
    }

    const parsed = await parseSubmission(form, now)
    if (!parsed.ok) {
        // A filled honeypot looks like success to the bot, and nothing is stored.
        return parsed.error === 'honeypot' ? redirect(`${origin}${THANKS_PATH}`, 303) : back(parsed.error)
    }
    /*
     * Configuration and storage failures all show the visitor `palvelu`; the log line names
     * which one (Pages → Deployments → Functions → real-time logs). No form data is logged.
     */
    const { DB: db, RECOMMENDATION_PHOTOS: photos, TURNSTILE_SECRET: secret } = env
    if (!db || !photos || !secret) {
        const missing = [!db && 'DB', !photos && 'RECOMMENDATION_PHOTOS', !secret && 'TURNSTILE_SECRET']
        console.error(`suosittele: missing ${missing.filter(Boolean).join(' ')}`)
        return back('palvelu')
    }
    if (!(await verifyTurnstile(form, request, secret, fetchFn))) return back('varmistus')

    const id = newId()
    const r = parsed.row
    try {
        await photos.put(photoKey(id), parsed.photo, { httpMetadata: { contentType: r.photo_type } })
    } catch (err) {
        console.error(`suosittele: photo upload failed: ${errorMessage(err)}`)
        return back('palvelu')
    }
    try {
        await db
            .prepare(
                `INSERT INTO recommendation_submissions (id, created_at, name, title_fi, title_sv, title_en, recommendation, photo_type, consent_at, consent_version)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(
                id,
                r.created_at,
                r.name,
                r.title_fi,
                r.title_sv,
                r.title_en,
                r.recommendation,
                r.photo_type,
                r.consent_at,
                r.consent_version
            )
            .run()
    } catch (err) {
        console.error(`suosittele: insert failed: ${errorMessage(err)}`)
        // An orphaned photo would outlive its row until the R2 lifecycle rule; remove it now.
        await photos.delete(photoKey(id)).catch(() => undefined)
        return back('palvelu')
    }

    return redirect(`${origin}${THANKS_PATH}`, 303)
}

/** The inbox bindings once the bearer token checks out, or the response to send instead. */
const inbox = (request: Request, env: RecommendationEnv): Response | { db: D1Like; photos: R2Like } => {
    if (!hasBearer(request, env.RECOMMENDATIONS_TOKEN)) return json({ error: 'unauthorized' }, 401)
    if (!env.DB || !env.RECOMMENDATION_PHOTOS) return json({ error: 'unavailable' }, 503)

    return { db: env.DB, photos: env.RECOMMENDATION_PHOTOS }
}

/** GET /api/suosittele/pending — every pending submission, oldest first, without photo bytes. */
export const handlePending = async (request: Request, env: RecommendationEnv): Promise<Response> => {
    const box = inbox(request, env)
    if (box instanceof Response) return box
    const { results } = await box.db
        .prepare(
            'SELECT id, created_at, name, title_fi, title_sv, title_en, recommendation, photo_type FROM recommendation_submissions ORDER BY created_at'
        )
        .all()

    return json({ submissions: results })
}

/** GET /api/suosittele/photo/:id — the stored photo bytes. */
export const handlePhoto = async (request: Request, env: RecommendationEnv, id: string): Promise<Response> => {
    const box = inbox(request, env)
    if (box instanceof Response) return box
    if (!ID.test(id)) return json({ error: 'not found' }, 404)
    const object = await box.photos.get(photoKey(id))
    if (!object) return json({ error: 'not found' }, 404)

    return new Response(object.body, {
        headers: {
            'Cache-Control': 'no-store',
            'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
        },
    })
}

/** DELETE /api/suosittele/:id — removes the photo, then the row. Used by approve and reject. */
export const handleDelete = async (request: Request, env: RecommendationEnv, id: string): Promise<Response> => {
    const box = inbox(request, env)
    if (box instanceof Response) return box
    if (!ID.test(id)) return json({ error: 'not found' }, 404)
    await box.photos.delete(photoKey(id))
    await box.db.prepare('DELETE FROM recommendation_submissions WHERE id = ?').bind(id).run()

    return json({ deleted: id })
}

/** GET /api/suosittele/stats — the pending count for the morning brief. */
export const handleStats = async (request: Request, env: RecommendationEnv): Promise<Response> => {
    if (!hasBearer(request, env.LIITY_STATS_TOKEN)) return json({ error: 'unauthorized' }, 401)
    if (!env.DB) return json({ error: 'unavailable' }, 503)
    const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM recommendation_submissions').first<{ n: number }>()

    return json({ pending: row?.n ?? 0 })
}
