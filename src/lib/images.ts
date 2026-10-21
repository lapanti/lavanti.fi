const BASE = 'https://lavanti.fi/images'

interface CFImageResult {
    height: number
    src: string
    width: number
}

interface VariantDef {
    fit: string
    gravity: string
    h: number
    w: number
}

const VARIANTS: Record<string, VariantDef> = {
    '1x1': { fit: 'crop', gravity: 'face', h: 1680, w: 1680 },
    /** Post author card portrait — a small face-cropped 4:5 portrait. */
    avatar: { fit: 'crop', gravity: 'face', h: 480, w: 384 },
    background: { fit: 'crop', gravity: 'auto', h: 660, w: 1920 },
    body: { fit: 'crop', gravity: 'auto', h: 1800, w: 2400 },
    hero: { fit: 'crop', gravity: 'face', h: 1320, w: 1728 },
    /** Split-hero mobile band — the designer's own landscape crop (hero-vaaka), not a re-crop. */
    heroLandscape: { fit: 'crop', gravity: 'face', h: 480, w: 800 },
    /** Split-hero desktop column — the designer's own portrait crop (hero-pysty), not a re-crop. */
    heroPortrait: { fit: 'crop', gravity: 'face', h: 2240, w: 1170 },
    og: { fit: 'crop', gravity: 'face', h: 630, w: 1200 },
    /**
     * A pre-composed social card (photo + wordmark + headline already laid out) —
     * gravity: 'auto' avoids face-cropping into the text half like `og` would.
     */
    ogFlat: { fit: 'cover', gravity: 'auto', h: 630, w: 1200 },
    /**
     * Post excerpt card thumbnail — a fixed 184px-tall band at a fluid, mostly-wide
     * card width. `1x1` (a square) doesn't match that shape, over-cropping the face
     * out of frame once object-fit: cover squeezes it into the landscape band.
     */
    postThumb: { fit: 'crop', gravity: 'face', h: 720, w: 1432 },
    /** 16:9 poster frame behind a VideoEmbed facade — matches the player's own aspect ratio. */
    video: { fit: 'crop', gravity: 'auto', h: 720, w: 1280 },
}

interface HeroSrcsetConfig {
    sizes: string
    variant: string
    widths: number[]
}

/**
 * Single source of truth for hero responsive configs — consumed by both the hero
 * components (`<img>`/`<source>` srcset+sizes) and the `<link rel="preload">` links
 * the layouts inject, so the two can never drift (a drifted preload double-downloads).
 */
export const HERO_CONFIGS = {
    /** heroBanner/Images.astro `<picture>` mobile `<img>` (front page + split pages). */
    landscape: { sizes: '100vw', variant: 'heroLandscape', widths: [560, 750, 1120, 1680] },
    /** titleBanner/Image.astro (`page`-variant title banner). */
    pageHero: { sizes: '(max-width: 1199px) 100vw, 50vw', variant: 'hero', widths: [864, 1080, 1296, 1728] },
    /** heroBanner/Images.astro `<picture>` desktop `<source>` (front page + split pages). */
    portrait: { sizes: '470px', variant: 'heroPortrait', widths: [560, 720, 1120, 1680] },
    /** titleBanner/HeroMedia.astro (post pages). */
    postHero: { sizes: '(max-width: 1223px) 100vw, 1224px', variant: 'hero', widths: [864, 1080, 1296, 1728] },
    /** heroBanner/Images.astro fallback branch — heroImage without mobileHeroImage. */
    single: { sizes: '(max-width: 768px) 100vw, 470px', variant: 'heroPortrait', widths: [560, 720, 1120, 1680] },
} as const satisfies Record<string, HeroSrcsetConfig>

export function getImage(slug: string, variant: string): CFImageResult {
    const v = VARIANTS[variant]
    if (!v) throw new Error(`Unknown image variant: ${variant}`)
    return {
        height: v.h,
        src: `${BASE}/${encodeURIComponent(slug)}/w=${v.w},h=${v.h},fit=${v.fit},gravity=${v.gravity},format=auto`,
        width: v.w,
    }
}

/**
 * Full-resolution download URL for the media gallery. Serves the original frame
 * scaled down to fit `width` (never upscaled) as a JPEG — `format=jpeg` rather than
 * the `format=auto` used elsewhere, so editors receive a file they can open, not AVIF/WebP.
 */
export function getDownloadUrl(slug: string, width = 3000, quality = 90): string {
    return `${BASE}/${encodeURIComponent(slug)}/w=${width},fit=scale-down,quality=${quality},format=jpeg`
}

export function getImageSrcset(
    slug: string,
    variant: string,
    widths: number[]
): { height: number; src: string; srcset: string; width: number } {
    const v = VARIANTS[variant]
    if (!v) throw new Error(`Unknown image variant: ${variant}`)
    const ratio = v.h / v.w
    const entries = widths.map((w) => {
        const h = Math.round(w * ratio)

        return `${BASE}/${encodeURIComponent(slug)}/w=${w},h=${h},fit=${v.fit},gravity=${v.gravity},format=auto ${w}w`
    })

    return {
        height: Math.round(widths[widths.length - 1] * ratio),
        src: entries[entries.length - 1].split(' ')[0],
        srcset: entries.join(', '),
        width: widths[widths.length - 1],
    }
}

/**
 * Preload attributes for an LCP hero. Byte-equal to the `<img>`/`<source>` markup built
 * from the same config. Callers must not add `crossorigin` (image fetches are no-cors;
 * a credentials-mode mismatch double-downloads) nor an `href` fallback (browsers without
 * `imagesrcset` support would fetch the largest width on every viewport).
 */
export function getHeroPreload(slug: string, config: HeroSrcsetConfig): { imagesizes: string; imagesrcset: string } {
    const { srcset } = getImageSrcset(slug, config.variant, config.widths)

    return { imagesizes: config.sizes, imagesrcset: srcset }
}
