/**
 * Generate split-hero treated image pairs from Markus Isomeri source photos.
 *
 * Recreates the two baked-in treatments of the front-page hero pair
 * (Lauri-Lavanti-dipolissa-lasijulkisivun-edessa-hero-{pysty,vaaka}.jpg),
 * reverse-engineered from its pixels:
 *
 * Desktop pysty (1170×2240):
 *   1. Subject matted from the background (rembg, isnet-general-use).
 *   2. Background graded to dark low-saturation forest green (grayscale + CLUT
 *      ramp, then a slight blend of the original to keep warm hints) — a quiet
 *      backdrop for the white wordmark rendered over the top-left at ≥769px.
 *   3. Sand band #EAE4D6 painted at x=1060–1170 on the background layer only.
 *   4. Subject recomposited on top, bottom-anchored — it overlaps the band from
 *      the front (the layered depth effect).
 *   Background and subject share the same scale/offset so the subject exactly
 *   covers its own silhouette in the graded background. Headroom for the
 *   wordmark comes from scaling down + mirror-padding the background upward.
 *
 * Mobile vaaka (800×480):
 *   1. Subject matted the same way.
 *   2. Background washed with a top-down #163E35 gradient that is fully opaque
 *      at y=0 — it must blend seamlessly into the solid deepForest header band
 *      above the image on mobile.
 *   3. Subject recomposited on top.
 *
 * Usage:
 *   npx tsx scripts/generate-hero-treatments.mts [photoId ...]
 *
 * With no args, generates every configured photo. Outputs
 * {outBase}-hero-pysty.jpg and {outBase}-hero-vaaka.jpg into
 * src/images/originals/. Mattes are cached in node_modules/.cache/hero-mattes/.
 *
 * Requires ImageMagick 7 (`magick`) and the rembg venv at .venv-matting/
 * (python3 -m venv --without-pip .venv-matting; bootstrap pip via get-pip.py;
 * pip install "rembg[cpu]" pillow coverage — `coverage` works around numba's
 * `coverage.types` import on Python 3.14).
 */

import { spawnSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')
const ORIGINALS_DIR = path.join(REPO_ROOT, 'src', 'images', 'originals')
const MATTE_CACHE_DIR = path.join(REPO_ROOT, 'node_modules', '.cache', 'hero-mattes')
const VENV_PYTHON = path.join(REPO_ROOT, '.venv-matting', 'bin', 'python')

/** Sand band colour — colors.lightSand as it appears in the reference JPG. */
const SAND = '#EAE4D6'
/** Solid deepForest header band colour the mobile top edge must blend into. */
const DEEP_FOREST = '#163E35'
/**
 * Desktop background duotone ramp: shadows → highlights, both dark forest. The
 * shadow floor sits well above black so the top zone can't crush to a menacing
 * near-black over dark source backgrounds — it lands near the front-page
 * reference's ~24% wordmark-zone lightness while staying a legibility backdrop
 * for the white overhanging nav wordmark.
 */
const RAMP_DARK = '#232d27'
const RAMP_LIGHT = '#35443c'
/** How much of the original background shows through the desktop grade (%). */
const ORIGINAL_BLEND_PCT = 10
/**
 * Extra darkening of the desktop background's top area — the wordmark zone
 * needs the reference's ~24% lightness for the white overhanging nav wordmark.
 * A gentle multiply (near-white) so it nudges the top rather than crushing it:
 * over these dark concrete-wall sources a strong multiply (the original gray55)
 * drove the zone to ~10% (near-black, "menacing"); the ramp floor now sets the
 * tone and this only trims highlights.
 */
const TOP_DARKEN_GRAY = 'gray88'
/**
 * The desktop grade is top-only: full strength from y=0 down to GRADE_HOLD of
 * the canvas height (covers the wordmark zone), then fades out by GRADE_STOP —
 * the lower background stays natural. The extra darkening uses the same shape.
 */
const GRADE_HOLD = 0.25
const GRADE_STOP = 0.55

const PYSTY_W = 1170
const PYSTY_H = 2240
const VAAKA_W = 800
const VAAKA_H = 480

/**
 * Desktop output slug suffix. Bumped from `-hero-pysty` to `-hero-pysty-v2` when
 * the top grade was softened (see RAMP_DARK / TOP_DARKEN_GRAY) — the treated
 * asset ships to Cloudflare Images by slug, so a new slug lets the corrected
 * pixels deploy additively (POST-only, no cache purge) and revert via git. The
 * mobile band keeps `-hero-vaaka` (its wash is unchanged).
 */
const PYSTY_SLUG_SUFFIX = '-hero-pysty-v2'

interface DesktopConfig {
    /** Horizontal shift of the shared bg+subject layer, px (negative = left). */
    dx: number
    /**
     * Canvas y of the source's top edge. Positive pushes the source down
     * (background mirror-pads the gap above); negative crops into the top.
     */
    dy: number
    /** Shared scale factor for source → canvas. */
    scale: number
}

interface MobileConfig {
    /** Crop window offsets into the scaled source, px. */
    cropX: number
    cropY: number
    /** Scale factor for source → crop space (≥ cover scale). */
    scale: number
    /** Wash height as a fraction of canvas height. */
    washStop: number
}

/**
 * Per-photo colour normalisation so every hero shares one palette: the shoot
 * spans golden sun and overcast light, so backgrounds get pulled into a common
 * tonal family (shared tone, texture kept) and skin toward the front-page
 * reference's warmth. Values are ImageMagick `-modulate` percentages plus
 * linear channel gains.
 */
interface ToneConfig {
    /** Blue channel gain (warmth: < 1 warms, > 1 cools). */
    blue: number
    /** -modulate brightness %. */
    brightness: number
    /** Red channel gain. */
    red: number
    /** -modulate saturation %. */
    saturation: number
}

/** CLI args applying a ToneConfig to the current image. */
function toneArgs(tone: ToneConfig | undefined): string[] {
    if (!tone) return []
    return [
        '-modulate',
        `${tone.brightness},${tone.saturation},100`,
        '-channel',
        'R',
        '-evaluate',
        'multiply',
        String(tone.red),
        '+channel',
        '-channel',
        'B',
        '-evaluate',
        'multiply',
        String(tone.blue),
        '+channel',
    ]
}

interface PhotoConfig {
    /** Background finishing tone (applied before the top grade / wash). */
    bgTone?: ToneConfig
    desktop: DesktopConfig
    id: string
    outBase: string
    pystySource: string
    /** Subject-layer tone (skin normalisation toward the reference). */
    subjectTone?: ToneConfig
    vaakaSource: string
    mobile: MobileConfig
}

/*
 * Per-photo tuning. Framing is solved from measured landmarks so all sub-page
 * heroes share one face metric. The numbers below are measured off the finished
 * assets rather than asserted — eye line and jaw-bottom, because the jaw is the
 * landmark that stays identifiable across a tilted-back gaze:
 *
 *   desktop (1170×2240): eye line y ≈ 1017, eye-to-jaw ≈ 334
 *   mobile  (800×480):   eye line y ≈ 202,  eye-to-jaw ≈ 118
 *   face centre x on the desktop canvas ≈ 450–495
 *
 * To place a new photo: scale = 334 / eye-to-jaw in the source, then
 * dy = 1017 − eye_y × scale (mobile: scale = 118 / eye-to-jaw,
 * cropY = eye_y × scale − 202).
 *
 * Horizontal placement is gaze-aware within the right-edge constraint (subject
 * may only be cut by the bottom and left frame edges).
 */
const PHOTOS: PhotoConfig[] = [
    {
        bgTone: { blue: 0.98, brightness: 78, red: 1.0, saturation: 58 },
        desktop: { dx: -517, dy: 315, scale: 1.83 },
        id: 'dipoli-mietteliaana',
        outBase: 'Lauri-Lavanti-dipolissa-kivimuurin-edessa-mietteliaana',
        pystySource: 'Lauri-Lavanti-dipolissa-kivimuurin-edessa-mietteliaana-pysty',
        subjectTone: { blue: 0.92, brightness: 100, red: 1.06, saturation: 110 },
        vaakaSource: 'Lauri-Lavanti-dipolissa-kivimuurin-edessa-mietteliaana-vaaka',
        mobile: { cropX: 83, cropY: 81, scale: 0.66, washStop: 0.55 },
    },
    {
        bgTone: { blue: 0.97, brightness: 90, red: 1.01, saturation: 75 },
        desktop: { dx: -570, dy: 132, scale: 1.91 },
        id: 'dipoli-katse-kameraan',
        outBase: 'Lauri-Lavanti-dipolissa-kivimuurin-edessa-katse-kameraan',
        pystySource: 'Lauri-Lavanti-dipolissa-kivimuurin-edessa-katse-kameraan-pysty',
        subjectTone: { blue: 0.9, brightness: 101, red: 1.06, saturation: 110 },
        vaakaSource: 'Lauri-Lavanti-dipolissa-kivimuurin-edessa-katse-kameraan-vaaka',
        mobile: { cropX: 140, cropY: 34, scale: 0.635, washStop: 0.45 },
    },
    /*
     * No aalto-auditorio entry: its crops are close-ups too tight to conform to
     * the hero framing without synthetic background fill (see placeVaaka).
     */
    {
        bgTone: { blue: 0.93, brightness: 120, red: 1.02, saturation: 80 },
        /* Desktop uses the high-res nelio — the koko-vartalo crop's laptop
         * corner forces the subject too far left; the nelio keeps the laptop
         * below the frame at near-native scale. */
        desktop: { dx: -1195, dy: 63, scale: 1.16 },
        id: 'portailla',
        outBase: 'Lauri-Lavanti-tyoskentelee-portailla',
        pystySource: 'Lauri-Lavanti-kannettavan-tietokoneen-aarella-nelio',
        subjectTone: { blue: 0.91, brightness: 95, red: 1.06, saturation: 110 },
        vaakaSource: 'Lauri-Lavanti-tyoskentelee-portailla-vaaka',
        mobile: { cropX: 155, cropY: 0, scale: 0.713, washStop: 0.45 },
    },
    /*
     * The 2026 outdoor set. Both crops take the full 3:2 frame as their source —
     * a portrait crop would cost placePysty the horizontal room it needs to keep
     * dx ≤ 0.
     */
    {
        bgTone: { blue: 0.96, brightness: 84, red: 1.02, saturation: 60 },
        desktop: { dx: -1765, dy: -28, scale: 1.713 },
        id: 'kerrostalopiha-kadet-taskuissa',
        outBase: 'Lauri-Lavanti-kerrostalopihalla-kadet-taskuissa',
        pystySource: 'Lauri-Lavanti-kerrostalopihalla-kadet-taskuissa-vaaka',
        subjectTone: { blue: 0.91, brightness: 98, red: 1.06, saturation: 110 },
        vaakaSource: 'Lauri-Lavanti-kerrostalopihalla-kadet-taskuissa-vaaka',
        mobile: { cropX: 407, cropY: 167, scale: 0.605, washStop: 0.5 },
    },
    {
        /* The tightest frame of the set: the source reaches the canvas bottom
         * with only ~19px to spare, so scale is not free to drop any further. */
        bgTone: { blue: 0.96, brightness: 86, red: 1.02, saturation: 62 },
        desktop: { dx: -1019, dy: 83, scale: 1.088 },
        id: 'kerrostalopiha-lahikuva',
        outBase: 'Lauri-Lavanti-kerrostalopihalla-lahikuva',
        pystySource: 'Lauri-Lavanti-kerrostalopihalla-lahikuva-vaaka',
        subjectTone: { blue: 0.91, brightness: 98, red: 1.06, saturation: 110 },
        vaakaSource: 'Lauri-Lavanti-kerrostalopihalla-lahikuva-vaaka',
        mobile: { cropX: 129, cropY: 128, scale: 0.384, washStop: 0.45 },
    },
    {
        /* Grey granite, so bgTone warms rather than cools the backdrop. */
        bgTone: { blue: 0.95, brightness: 95, red: 1.03, saturation: 66 },
        desktop: { dx: -1233, dy: 270, scale: 1.215 },
        id: 'graniittimuuri-kadet-puuskassa',
        outBase: 'Lauri-Lavanti-graniittimuurin-edessa-kadet-puuskassa',
        pystySource: 'Lauri-Lavanti-graniittimuurin-edessa-kadet-puuskassa-vaaka',
        subjectTone: { blue: 0.91, brightness: 98, red: 1.06, saturation: 110 },
        vaakaSource: 'Lauri-Lavanti-graniittimuurin-edessa-kadet-puuskassa-vaaka',
        mobile: { cropX: 205, cropY: 62, scale: 0.429, washStop: 0.5 },
    },
    {
        bgTone: { blue: 0.95, brightness: 95, red: 1.03, saturation: 66 },
        desktop: { dx: -1609, dy: 199, scale: 1.67 },
        id: 'graniittimuuri-kasi-taskussa',
        outBase: 'Lauri-Lavanti-graniittimuurin-edessa-kasi-taskussa',
        pystySource: 'Lauri-Lavanti-graniittimuurin-edessa-kasi-taskussa-vaaka',
        subjectTone: { blue: 0.91, brightness: 98, red: 1.06, saturation: 110 },
        vaakaSource: 'Lauri-Lavanti-graniittimuurin-edessa-kasi-taskussa-vaaka',
        mobile: { cropX: 346, cropY: 87, scale: 0.59, washStop: 0.5 },
    },
]

function run(cmd: string, args: string[]): void {
    const res = spawnSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    if (res.status !== 0) {
        throw new Error(`${cmd} ${args.join(' ')}\nfailed (${res.status}): ${res.stderr?.toString()}`)
    }
}

function magick(args: string[]): void {
    run('magick', args)
}

function identifySize(file: string): { height: number; width: number } {
    const res = spawnSync('magick', ['identify', '-format', '%w %h', file], { stdio: ['ignore', 'pipe', 'pipe'] })
    if (res.status !== 0) throw new Error(`identify failed for ${file}: ${res.stderr?.toString()}`)
    const [w, h] = res.stdout.toString().trim().split(' ').map(Number)
    return { height: h, width: w }
}

/** Matte the subject out of a source photo via rembg; cached by source slug. */
function matteSubject(sourceSlug: string): string {
    const out = path.join(MATTE_CACHE_DIR, `${sourceSlug}.png`)
    if (fs.existsSync(out)) return out
    fs.mkdirSync(MATTE_CACHE_DIR, { recursive: true })
    const src = path.join(ORIGINALS_DIR, `${sourceSlug}.jpg`)
    console.log(`  matting ${sourceSlug}…`)
    run(VENV_PYTHON, [
        '-c',
        [
            'import sys',
            'from rembg import remove, new_session',
            'from PIL import Image',
            'img = Image.open(sys.argv[1]).convert("RGB")',
            'res = remove(img, session=new_session("isnet-general-use"))',
            'res.save(sys.argv[2])',
        ].join('\n'),
        src,
        out,
    ])
    return out
}

function geometryOffset(x: number, y: number): string {
    return `${x >= 0 ? '+' : ''}${x}${y >= 0 ? '+' : ''}${y}`
}

/**
 * Shared transform for the desktop layers: scale, then place the source's top
 * edge at canvas y = dy with an x-shift of dx. Background and subject use the
 * exact same mapping so the subject covers its own silhouette in the graded
 * background. When dy > 0 the background mirror-pads the gap above with the
 * flipped top strip (seamless texture); the subject just floats on transparency.
 */
function placePysty(input: string, output: string, cfg: DesktopConfig, transparent: boolean): void {
    const { height, width } = identifySize(input)
    const w = Math.round(width * cfg.scale)
    const h = Math.round(height * cfg.scale)
    // The scaled source must cover the full canvas width and reach its bottom;
    // only the top may be short (it gets the mirrored pad). Anything else would
    // need synthetic fill the treatment doesn't allow — refuse to generate.
    if (cfg.dx > 0 || cfg.dx + w < PYSTY_W || cfg.dy + h < PYSTY_H) {
        throw new Error(
            `desktop placement (scale ${cfg.scale}, dx ${cfg.dx}, dy ${cfg.dy}) leaves part of the ` +
                `${PYSTY_W}x${PYSTY_H} canvas uncovered by the ${w}x${h} source — the photo cannot ` +
                `conform to the hero framing without synthetic background fill`
        )
    }
    const args = [input, '-resize', `${w}x${h}!`]
    let y = cfg.dy
    if (!transparent && cfg.dy > 0) {
        // Mirror the top strip upward so the graded background has no seam;
        // blur it heavily so the duplicated texture reads as out-of-focus
        // depth instead of a visible reflection.
        args.push('(', '+clone', '-crop', `${w}x${cfg.dy}+0+0`, '-flip', '-blur', '0x25', ')', '+swap', '-append')
        y = 0
    }
    args.push(
        '(',
        '-size',
        `${PYSTY_W}x${PYSTY_H}`,
        `xc:${transparent ? 'none' : 'black'}`,
        ')',
        '+swap',
        '-compose',
        'over',
        '-gravity',
        'northwest',
        '-geometry',
        geometryOffset(cfg.dx, y),
        '-composite',
        output
    )
    magick(args)
}

/**
 * Shared transform for the mobile layers: scale, then crop the canvas window
 * at (cropX, cropY) in scaled-source coords. The window must be a true crop —
 * a source too small for it (below-cover scale or out-of-bounds offsets) would
 * need synthetic background fill, which is not acceptable for these heroes, so
 * that case throws instead. Photos that can't conform are simply not treated
 * (this is why there is no aalto-auditorio config: its crops are too tight for
 * the mobile framing).
 */
function placeVaaka(input: string, output: string, cfg: MobileConfig, transparent: boolean): void {
    const { height, width } = identifySize(input)
    const w = Math.round(width * cfg.scale)
    const h = Math.round(height * cfg.scale)
    if (cfg.cropX < 0 || cfg.cropY < 0 || cfg.cropX + VAAKA_W > w || cfg.cropY + VAAKA_H > h) {
        throw new Error(
            `mobile window ${VAAKA_W}x${VAAKA_H}+${cfg.cropX}+${cfg.cropY} does not fit inside ` +
                `the scaled source (${w}x${h}) — the photo cannot conform to the hero framing ` +
                `without synthetic background fill`
        )
    }
    magick([
        input,
        ...(transparent ? ['-background', 'none'] : []),
        '-resize',
        `${w}x${h}!`,
        '-crop',
        `${VAAKA_W}x${VAAKA_H}+${cfg.cropX}+${cfg.cropY}`,
        '+repage',
        output,
    ])
}

/** Fill interior holes in the matte's alpha without eating the outer edge. */
function fillMatteHoles(matte: string, output: string): void {
    magick([
        matte,
        '(',
        '+clone',
        '-alpha',
        'extract',
        '-morphology',
        'Close',
        'Disk:12',
        ')',
        '-compose',
        'CopyOpacity',
        '-composite',
        output,
    ])
}

function generateDesktop(photo: PhotoConfig, tmpDir: string): string {
    const src = path.join(ORIGINALS_DIR, `${photo.pystySource}.jpg`)
    const matte = matteSubject(photo.pystySource)
    const cut = path.join(tmpDir, 'cut.png')
    const bg = path.join(tmpDir, 'bg.png')
    const bgGraded = path.join(tmpDir, 'bg-graded.png')
    const subj = path.join(tmpDir, 'subj.png')
    const out = path.join(ORIGINALS_DIR, `${photo.outBase}${PYSTY_SLUG_SUFFIX}.jpg`)

    fillMatteHoles(matte, cut)
    if (photo.subjectTone) magick([cut, ...toneArgs(photo.subjectTone), cut])
    placePysty(src, bg, photo.desktop, false)
    if (photo.bgTone) magick([bg, ...toneArgs(photo.bgTone), bg])
    placePysty(cut, subj, photo.desktop, true)

    // Grade the top only: the duotone forest ramp (+ a hint of the original for
    // warm accents) holds full strength through the wordmark zone (GRADE_HOLD),
    // fades out by GRADE_STOP, and leaves the lower background natural. Then
    // extra darkening with the same shape and the sand band — all on the
    // background layer only.
    const holdH = Math.round(PYSTY_H * GRADE_HOLD)
    const fadeH = Math.round(PYSTY_H * (GRADE_STOP - GRADE_HOLD))
    magick([
        bg,
        '(',
        '+clone',
        '-colorspace',
        'Gray',
        '(',
        '-size',
        '1x256',
        `gradient:${RAMP_DARK}-${RAMP_LIGHT}`,
        ')',
        '-clut',
        '-type',
        'TrueColor',
        '(',
        bg,
        ')',
        '-define',
        `compose:args=${ORIGINAL_BLEND_PCT}`,
        '-compose',
        'blend',
        '-composite',
        ')',
        // Clear the blend args — a lingering compose:args corrupts the masked composite below.
        '+define',
        'compose:args',
        '(',
        '-size',
        `${PYSTY_W}x${holdH}`,
        'xc:white',
        '(',
        '-size',
        `${PYSTY_W}x${fadeH}`,
        'gradient:white-black',
        ')',
        '-append',
        '-background',
        'black',
        '-gravity',
        'north',
        '-extent',
        `${PYSTY_W}x${PYSTY_H}`,
        ')',
        '-compose',
        'over',
        '-composite',
        '(',
        '-size',
        `${PYSTY_W}x${holdH}`,
        `xc:${TOP_DARKEN_GRAY}`,
        '(',
        '-size',
        `${PYSTY_W}x${fadeH}`,
        `gradient:${TOP_DARKEN_GRAY}-white`,
        ')',
        '-append',
        '-background',
        'white',
        '-gravity',
        'north',
        '-extent',
        `${PYSTY_W}x${PYSTY_H}`,
        ')',
        '-compose',
        'multiply',
        '-composite',
        '-fill',
        SAND,
        '-draw',
        `rectangle ${PYSTY_W - 110},0 ${PYSTY_W},${PYSTY_H}`,
        bgGraded,
    ])
    magick([bgGraded, subj, '-compose', 'over', '-composite', '-strip', '-quality', '88', out])
    return out
}

function generateMobile(photo: PhotoConfig, tmpDir: string): string {
    const src = path.join(ORIGINALS_DIR, `${photo.vaakaSource}.jpg`)
    const matte = matteSubject(photo.vaakaSource)
    const cut = path.join(tmpDir, 'cut-vaaka.png')
    const bg = path.join(tmpDir, 'bg-vaaka.png')
    const bgWashed = path.join(tmpDir, 'bg-vaaka-washed.png')
    const subj = path.join(tmpDir, 'subj-vaaka.png')
    const out = path.join(ORIGINALS_DIR, `${photo.outBase}-hero-vaaka.jpg`)

    fillMatteHoles(matte, cut)
    if (photo.subjectTone) magick([cut, ...toneArgs(photo.subjectTone), cut])
    placeVaaka(src, bg, photo.mobile, false)
    if (photo.bgTone) magick([bg, ...toneArgs(photo.bgTone), bg])
    placeVaaka(cut, subj, photo.mobile, true)

    // Top-down deepForest wash over the toned background: fully opaque at y=0
    // (seamless blend with the solid header band above), fading out by washStop
    // of the height. Background tone normalisation happens in bgTone above.
    const washH = Math.round(VAAKA_H * photo.mobile.washStop)
    magick([
        bg,
        '(',
        '-size',
        `${VAAKA_W}x${washH}`,
        `gradient:${DEEP_FOREST}-none`,
        '-background',
        'none',
        '-gravity',
        'north',
        '-extent',
        `${VAAKA_W}x${VAAKA_H}`,
        ')',
        '-compose',
        'over',
        '-composite',
        bgWashed,
    ])
    magick([bgWashed, subj, '-compose', 'over', '-composite', '-strip', '-quality', '85', out])
    return out
}

function main(): void {
    const requested = process.argv.slice(2)
    const photos = requested.length > 0 ? PHOTOS.filter((p) => requested.includes(p.id)) : PHOTOS
    const unknown = requested.filter((id) => !PHOTOS.some((p) => p.id === id))
    if (unknown.length > 0) {
        console.error(`Unknown photo id(s): ${unknown.join(', ')}. Known: ${PHOTOS.map((p) => p.id).join(', ')}`)
        process.exit(1)
    }
    if (!fs.existsSync(VENV_PYTHON)) {
        console.error(`Missing rembg venv at ${VENV_PYTHON} — see the header comment for setup.`)
        process.exit(1)
    }

    for (const photo of photos) {
        console.log(`\n${photo.id}`)
        const tmpDir = fs.mkdtempSync(path.join(fs.realpathSync(process.env.TMPDIR ?? '/tmp'), 'hero-treatments-'))
        try {
            console.log(`  desktop → ${path.basename(generateDesktop(photo, tmpDir))}`)
            console.log(`  mobile  → ${path.basename(generateMobile(photo, tmpDir))}`)
        } finally {
            fs.rmSync(tmpDir, { force: true, recursive: true })
        }
    }
    console.log('\nDone.')
}

main()
