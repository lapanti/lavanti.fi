import type { APIRoute, GetStaticPaths } from 'astro'
import type { OgCard } from '../../lib/og/cards'

import { getOgCards } from '../../lib/og/cards'
import { renderOgCard } from '../../lib/og/render'

export const getStaticPaths: GetStaticPaths = async () => {
    const cards = await getOgCards()

    return cards.map((card) => ({ params: { id: card.id }, props: { card } }))
}

export const GET: APIRoute = async ({ props }) => {
    const jpeg = await renderOgCard((props as { card: OgCard }).card)

    return new Response(jpeg as BodyInit, {
        headers: {
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Content-Type': 'image/jpeg',
        },
    })
}
