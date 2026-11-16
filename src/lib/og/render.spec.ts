import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { renderOgCard } from './render'

// WhatsApp drops link-preview images above ~300 KB; keep real margin under it.
const MAX_BYTES = 200 * 1024

const inspect = async (bytes: Uint8Array) => {
    const { format, height, width } = await sharp(bytes).metadata()

    return { bytes: bytes.length, format, height, width }
}

const CARD = { format: 'jpeg', height: 630, width: 1200 }

describe('renderOgCard', () => {
    it('renders a 1200×630 JPEG for a card with an emphasised word', async () => {
        const card = await inspect(
            await renderOgCard({ emphasis: 'eduskuntaan', id: 'fi__about', lang: 'fi', title: 'Osaamista' })
        )

        expect(card).toMatchObject(CARD)
        expect(card.bytes).toBeLessThan(MAX_BYTES)
    })

    it('renders a card without an emphasis word (e.g. a category page)', async () => {
        const card = await inspect(await renderOgCard({ id: 'fi__category__economy', lang: 'fi', title: 'Talous' }))

        expect(card).toMatchObject(CARD)
        expect(card.bytes).toBeLessThan(MAX_BYTES)
    })

    it('renders a card with a per-page portrait photo', async () => {
        // portrait-portailla.jpg is the largest portrait asset, so the worst case for size.
        const card = await inspect(
            await renderOgCard({
                id: 'fi__contact',
                lang: 'fi',
                photo: 'portrait-portailla.jpg',
                title: 'Ota yhteyttä',
            })
        )

        expect(card).toMatchObject(CARD)
        expect(card.bytes).toBeLessThan(MAX_BYTES)
    })
})
