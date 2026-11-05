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
}

export const coAuthors = {
    'anna-jaakola': { name: 'Anna Jaakola', url: 'https://markkinavihreat.fi/ketka/anna-jaakola/' },
    'arttu-laitinen': { name: 'Arttu Laitinen', url: 'https://markkinavihreat.fi/ketka/arttu-laitinen/' },
    'atte-harjanne': { name: 'Atte Harjanne', url: 'https://markkinavihreat.fi/ketka/atte-harjanne/' },
    'essi-lindberg': { name: 'Essi Lindberg', url: 'https://markkinavihreat.fi/ketka/essi-lindberg/' },
    'ester-dufva': { name: 'Ester Dufva' },
    'johanna-fleming': { name: 'Johanna Fleming' },
    'johanna-muurinen': { name: 'Johanna Muurinen', url: 'https://markkinavihreat.fi/ketka/johanna-muurinen/' },
    'kalle-euro': { name: 'Kalle Euro', url: 'https://markkinavihreat.fi/ketka/kalle-euro/' },
    'lauri-nevanpera': { name: 'Lauri Nevanperä', url: 'https://markkinavihreat.fi/ketka/lauri-nevanpera/' },
    'mari-holopainen': { name: 'Mari Holopainen' },
    'mervi-somervuori': { name: 'Mervi Somervuori' },
    'miisa-jeremejew': { name: 'Miisa Jeremejew' },
    'paula-oittinen': { name: 'Paula Oittinen' },
    'pinja-pekkarniemi': { name: 'Pinja Pekkarniemi' },
    'pyry-vare': { name: 'Pyry Väre' },
    'ronja-karkinen': { name: 'Ronja Karkinen' },
    'sanni-jappinen': { name: 'Sanni Jäppinen' },
    'susanna-sielo': { name: 'Susanna Sielo', url: 'https://markkinavihreat.fi/ketka/susanna-sielo/' },
    'suvi-annala': { name: 'Suvi Annala' },
    'taru-hallikainen': { name: 'Taru Hallikainen', url: 'https://markkinavihreat.fi/ketka/taru-hallikainen/' },
    'ulla-santti': { name: 'Ulla Santti', url: 'https://markkinavihreat.fi/ketka/ulla-santti/' },
    'ville-aarnio': { name: 'Ville Aarnio', url: 'https://markkinavihreat.fi/ketka/ville-aarnio/' },
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
