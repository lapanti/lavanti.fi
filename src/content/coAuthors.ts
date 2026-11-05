/**
 * Everyone who has co-written a post with Lauri, keyed by a stable id that meta.json
 * `authors` references: `["lauri", "arttu-laitinen"]`. The loader expands an id to the
 * full entry, so the byline and the JSON-LD Person node both read from here.
 *
 * Only identity lives here. A role is what the person was when the post was written
 * ("varavaltuutettu" in 2026 may be "kansanedustaja" by 2027), so it stays on the post:
 * `{ "id": "arttu-laitinen", "role": "…" }`.
 */
export interface CoAuthor {
    name: string
    /** Profile page; becomes the JSON-LD Person `url`. */
    url?: string
    sameAs?: string[]
    /**
     * Cloudflare Images name of a 4:5 portrait, `kanssakirjoittaja-<id>`; the original
     * lives in src/images/originals/. Every portrait shares one framing (head about half
     * the height, crown near the top) so a list of them reads as a set. No photo, no image.
     */
    image?: string
}

const mv = (id: string) => `https://markkinavihreat.fi/ketka/${id}/`
const photo = (id: string) => `kanssakirjoittaja-${id}`

export const coAuthors = {
    'anna-jaakola': { image: photo('anna-jaakola'), name: 'Anna Jaakola', url: mv('anna-jaakola') },
    'arttu-laitinen': { image: photo('arttu-laitinen'), name: 'Arttu Laitinen', url: mv('arttu-laitinen') },
    'atte-harjanne': { image: photo('atte-harjanne'), name: 'Atte Harjanne', url: mv('atte-harjanne') },
    'essi-lindberg': { image: photo('essi-lindberg'), name: 'Essi Lindberg', url: mv('essi-lindberg') },
    'ester-dufva': { name: 'Ester Dufva' },
    'johanna-fleming': { image: photo('johanna-fleming'), name: 'Johanna Fleming' },
    'johanna-muurinen': { image: photo('johanna-muurinen'), name: 'Johanna Muurinen', url: mv('johanna-muurinen') },
    'kalle-euro': { image: photo('kalle-euro'), name: 'Kalle Euro', url: mv('kalle-euro') },
    'lauri-nevanpera': { image: photo('lauri-nevanpera'), name: 'Lauri Nevanperä', url: mv('lauri-nevanpera') },
    'mari-holopainen': { image: photo('mari-holopainen'), name: 'Mari Holopainen' },
    'mervi-somervuori': { image: photo('mervi-somervuori'), name: 'Mervi Somervuori' },
    'miisa-jeremejew': { name: 'Miisa Jeremejew' },
    'paula-oittinen': { image: photo('paula-oittinen'), name: 'Paula Oittinen' },
    'pinja-pekkarniemi': { image: photo('pinja-pekkarniemi'), name: 'Pinja Pekkarniemi' },
    'pyry-vare': { name: 'Pyry Väre' },
    'ronja-karkinen': { name: 'Ronja Karkinen' },
    'sanni-jappinen': { image: photo('sanni-jappinen'), name: 'Sanni Jäppinen' },
    'susanna-sielo': { image: photo('susanna-sielo'), name: 'Susanna Sielo', url: mv('susanna-sielo') },
    'suvi-annala': { name: 'Suvi Annala' },
    'taru-hallikainen': { image: photo('taru-hallikainen'), name: 'Taru Hallikainen', url: mv('taru-hallikainen') },
    'ulla-santti': { image: photo('ulla-santti'), name: 'Ulla Santti', url: mv('ulla-santti') },
    'ville-aarnio': { image: photo('ville-aarnio'), name: 'Ville Aarnio', url: mv('ville-aarnio') },
} as const satisfies Record<string, CoAuthor>

export type CoAuthorId = keyof typeof coAuthors

export const isCoAuthorId = (id: string): id is CoAuthorId => Object.hasOwn(coAuthors, id)

/**
 * Expands a meta.json co-author to its registry entry plus the post's own role. An
 * inline `{ name, … }` object (pre-registry format) passes through unchanged. An unknown
 * id throws, so a typo fails the build instead of printing a raw id on the page.
 */
export function expandCoAuthor<Role>(
    entry: string | { id: string; role?: Role } | (CoAuthor & { role?: Role })
): CoAuthor & { id?: string; role?: Role } {
    if (typeof entry === 'object' && !('id' in entry)) return entry

    const { id, role } = typeof entry === 'string' ? { id: entry, role: undefined } : entry
    if (!isCoAuthorId(id)) throw new Error(`Unknown co-author id "${id}"; add it to src/content/coAuthors.ts`)

    return { ...coAuthors[id], id, ...(role !== undefined ? { role } : {}) }
}
