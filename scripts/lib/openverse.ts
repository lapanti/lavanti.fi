/**
 * Openverse API client and hero-credit formatting for scripts/openverse.ts.
 *
 * Only CC0, PDM and CC BY are ever searched or accepted; the allowlist is a
 * constant, not an option. Every network call takes an injectable fetchImpl
 * so tests run without the network.
 */

const API = 'https://api.openverse.org/v1'
const ALLOWED_LICENSES = Object.freeze(['cc0', 'pdm', 'by'])
export const USER_AGENT = 'lavanti.fi-tools (+https://lavanti.fi)'

type FetchImpl = typeof fetch

/** The fields of an Openverse image record this tool reads. */
export interface OpenverseImage {
    creator?: null | string
    creator_url?: null | string
    filetype?: null | string
    foreign_landing_url?: null | string
    height?: null | number
    id: string
    license?: null | string
    license_url?: null | string
    license_version?: null | string
    mature?: boolean
    provider?: null | string
    title?: null | string
    url?: null | string
    width?: null | number
}

/** The `heroImageCredit` block of a post's meta.json (schema: src/content.config.ts). */
export interface HeroImageCredit {
    creator?: string
    creatorUrl?: string
    landingUrl?: string
    license: string
    licenseUrl?: string
    modified: boolean
    title?: string
}

/** Anonymous requests get HTTP 401 above page_size 20; registered clients may ask for 50. */
export const maxPageSize = (token: null | string): number => (token ? 50 : 20)

interface SearchOptions {
    aspect?: string
    maxPage?: number
    n?: number | string
    size?: string
}

/** Image search URL. The license and mature filters are fixed. */
export function searchUrl(q: string, { aspect, maxPage = 20, n = 20, size }: SearchOptions = {}): string {
    if (!q.trim()) throw new Error('empty query')
    const pageSize = Math.min(Math.max(Number(n) || 20, 1), maxPage)
    const p = new URLSearchParams({
        license: ALLOWED_LICENSES.join(','),
        mature: 'false',
        page_size: String(pageSize),
        q: q.trim(),
    })
    if (aspect) p.set('aspect_ratio', aspect)
    if (size) p.set('size', size)
    return `${API}/images/?${p}`
}

const isAllowed = (license: null | string | undefined): boolean =>
    ALLOWED_LICENSES.includes(String(license ?? '').toLowerCase())

/** Results that pass the allowlist again (defence in depth). */
export const filterResults = (results: OpenverseImage[] | undefined): OpenverseImage[] =>
    (results ?? []).filter((r) => isAllowed(r.license) && !r.mature)

export function assertAllowed(item: OpenverseImage): void {
    if (!isAllowed(item.license)) {
        throw new Error(`${item.id}: license "${item.license ?? 'none'}" is not CC0, PDM or CC BY — refused`)
    }
    if (item.mature) throw new Error(`${item.id}: flagged mature — refused`)
}

/** Bearer token from OPENVERSE_CLIENT_ID/SECRET, or null for anonymous access. */
export async function authToken({
    env = process.env,
    fetchImpl = fetch,
}: { env?: NodeJS.ProcessEnv; fetchImpl?: FetchImpl } = {}): Promise<null | string> {
    const { OPENVERSE_CLIENT_ID: id, OPENVERSE_CLIENT_SECRET: secret } = env
    if (!id || !secret) return null
    const res = await fetchImpl(`${API}/auth_tokens/token/`, {
        body: new URLSearchParams({ client_id: id, client_secret: secret, grant_type: 'client_credentials' }),
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': USER_AGENT },
        method: 'POST',
    })
    if (!res.ok) throw new Error(`Openverse token: HTTP ${res.status}`)
    const json = (await res.json()) as { access_token?: string }

    return json.access_token ?? null
}

export async function getJson<T>(
    url: string,
    { fetchImpl = fetch, token }: { fetchImpl?: FetchImpl; token?: null | string } = {}
): Promise<T> {
    const headers: Record<string, string> = { accept: 'application/json', 'user-agent': USER_AGENT }
    if (token) headers.authorization = `Bearer ${token}`
    const res = await fetchImpl(url, { headers })
    if (res.status === 429) {
        throw new Error('Openverse rate limit (HTTP 429) — wait, or set OPENVERSE_CLIENT_ID/SECRET in .env')
    }
    if (!res.ok) throw new Error(`Openverse ${new URL(url).pathname}: HTTP ${res.status}`)
    return (await res.json()) as T
}

export const detailUrl = (id: string): string => `${API}/images/${encodeURIComponent(id)}/`

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function assertUuid(id: string): void {
    if (!UUID.test(id)) throw new Error(`needs the full Openverse id (a UUID) — got "${id}"`)
}

const KNOWN_EXT = new Set(['jpg', 'png', 'webp'])

/**
 * File extension for a download. Openverse `filetype` is the provider's label,
 * not always an extension, so anything unknown falls back to the URL, then to
 * .jpg. GIF is not accepted: Cloudflare Images would serve it, but the upload
 * script only sends JPEG, PNG and WebP.
 */
export function extFor(item: OpenverseImage): string {
    const norm = (s: string): string => s.toLowerCase().replace('jpeg', 'jpg')
    const ft = norm(String(item.filetype ?? ''))
    if (KNOWN_EXT.has(ft)) return `.${ft}`
    const fromUrl = norm(/\.([a-z0-9]{3,4})(?:[?#]|$)/i.exec(String(item.url ?? ''))?.[1] ?? '')
    if (KNOWN_EXT.has(fromUrl)) return `.${fromUrl}`
    return '.jpg'
}

export function licenseLabel(item: OpenverseImage): string {
    const v = item.license_version ? ` ${item.license_version}` : ''
    const license = String(item.license ?? '').toLowerCase()
    if (license === 'by') return `CC BY${v}`
    if (license === 'cc0') return `CC0${v}`
    if (license === 'pdm') return `Public Domain Mark${v}`
    throw new Error(`${item.id}: license ${item.license ?? 'none'} not allowed`)
}

/**
 * The `heroImageCredit` object for a post's meta.json: title, author, source
 * and licence (TASL), plus whether the image was cropped or edited. Empty
 * fields are left out so the object validates against the optional schema keys.
 */
export function heroCredit(item: OpenverseImage, { modified = false }: { modified?: boolean } = {}): HeroImageCredit {
    assertAllowed(item)
    const opt = (key: keyof HeroImageCredit, value: null | string | undefined): Partial<HeroImageCredit> =>
        value?.trim() ? { [key]: value.trim() } : {}

    return {
        ...opt('title', item.title),
        ...opt('creator', item.creator),
        ...opt('creatorUrl', item.creator_url),
        ...opt('landingUrl', item.foreign_landing_url),
        license: licenseLabel(item),
        ...opt('licenseUrl', item.license_url),
        modified,
    }
}
