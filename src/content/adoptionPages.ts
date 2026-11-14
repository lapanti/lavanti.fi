import raw from './adoptionPages.json'
import { type Lang, LANGS } from './nav'

/**
 * Opt-in personal adoption pages (spec: .agents/specs/sign-adoption/spec.md § Personal pages).
 * `npm run adoptions -- page add|remove` edits adoptionPages.json, one entry per commit
 * (scripts/checks/adoption-pages.ts). The build fails on an invalid entry rather than publish it.
 */
export interface AdoptionPage {
    lang: Lang
    /** The approved message, if any. */
    message?: string
    /** The approved sign name. */
    name: string
    slug: string
}

/** Thanks-page segments under the same bases; a personal page must never shadow them. */
export const RESERVED_SLUGS = ['kiitos', 'tack', 'thanks']

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const validateAdoptionPages = (entries: unknown): AdoptionPage[] => {
    if (!Array.isArray(entries)) throw new Error('adoptionPages.json must be an array')
    const seen = new Set<string>()

    return entries.map((entry, i) => {
        const e = entry as Partial<AdoptionPage>
        const where = `adoptionPages.json[${i}]`
        if (typeof e.slug !== 'string' || !SLUG.test(e.slug)) throw new Error(`${where}: bad slug`)
        if (RESERVED_SLUGS.includes(e.slug)) throw new Error(`${where}: slug ${e.slug} is reserved`)
        if (seen.has(e.slug)) throw new Error(`${where}: duplicate slug ${e.slug}`)
        seen.add(e.slug)
        if (typeof e.name !== 'string' || e.name.trim().length < 2 || e.name.length > 24) {
            throw new Error(`${where}: bad name`)
        }
        if (!LANGS.includes(e.lang as Lang)) throw new Error(`${where}: bad lang`)
        if (e.message !== undefined && (typeof e.message !== 'string' || e.message.length > 140)) {
            throw new Error(`${where}: bad message`)
        }

        return { lang: e.lang as Lang, name: e.name, slug: e.slug, ...(e.message ? { message: e.message } : {}) }
    })
}

export const adoptionPages: AdoptionPage[] = validateAdoptionPages(raw)

export const adoptionPagesFor = (lang: Lang): AdoptionPage[] => adoptionPages.filter((p) => p.lang === lang)
