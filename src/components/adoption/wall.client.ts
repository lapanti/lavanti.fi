/**
 * Browser glue for AdoptionWall.astro. Writes only textContent; the wall endpoint already applies
 * the thresholds (no count under 3 approved rows, no names under 3 opted-in names).
 */

import { loadWall, readStoredAdoption } from '../../lib/adoptionClient'

export interface AdoptionWallData {
    count: string
    municipalities: Record<string, string>
    other: string
    ownTile: string
}

const initAdoptionWall = (): void => {
    const root = document.querySelector<HTMLElement>('[data-wall]')
    const dataEl = document.getElementById('adoption-wall-data')
    if (!root || !dataEl) return
    const data = JSON.parse(dataEl.textContent ?? '{}') as AdoptionWallData
    const part = (name: string) => root.querySelector<HTMLElement>(`[data-wall-${name}]`)!
    const own = readStoredAdoption(() => window.sessionStorage)

    void loadWall().then((wall) => {
        let shown = false
        if (wall.signs !== null) {
            part('count').textContent = data.count.replace('%n', String(wall.signs))
            part('count').hidden = false
            shown = true
        }

        const cells = Object.entries(wall.municipalities).sort(([, a], [, b]) => b - a)
        if (cells.length > 0) {
            part('municipalities').querySelector('span')!.textContent = cells
                .map(([key, n]) => `${key === 'muu' ? data.other : (data.municipalities[key] ?? key)} ${n}`)
                .join(' · ')
            part('municipalities').hidden = false
            shown = true
        }

        const tiles = part('adopters')
        const tile = (text: string, className?: string) => {
            const li = document.createElement('li')
            li.textContent = text
            if (className) li.className = className
            tiles.append(li)
        }
        if (own)
            tile(
                data.ownTile.replace('%s', () => own.name),
                'own'
            )
        for (const name of wall.names) tile(name)
        if (tiles.children.length > 0) {
            tiles.hidden = false
            shown = true
        }

        const messages = part('messages').querySelector('.messages')!
        for (const { message, name } of wall.messages) {
            const quote = document.createElement('blockquote')
            const p = document.createElement('p')
            p.textContent = message
            const cite = document.createElement('cite')
            cite.textContent = name
            quote.append(p, cite)
            messages.append(quote)
        }
        part('messages').hidden = wall.messages.length === 0

        root.hidden = !shown
    })
}

// Loaded with <script src> from AdoptionWall.astro.
initAdoptionWall()
