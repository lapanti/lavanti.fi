/**
 * Upload all originals from src/images/originals/ to Cloudflare Images.
 *
 * Usage:
 *   CF_ACCOUNT_ID=xxx CF_API_TOKEN=xxx npx tsx scripts/upload-to-cf-images.mts
 *
 * Skips images that already exist in CF (error code 5409). Idempotent.
 * Detects PNG vs JPEG from file extension and sets content-type accordingly.
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')
const ORIGINALS_DIR = path.join(REPO_ROOT, 'src', 'images', 'originals')

const ACCOUNT_ID = process.env.CF_ACCOUNT_ID
const API_TOKEN = process.env.CF_API_TOKEN

if (!ACCOUNT_ID || !API_TOKEN) {
    console.error('Missing CF_ACCOUNT_ID or CF_API_TOKEN environment variables')
    process.exit(1)
}

function contentType(ext: string): string {
    if (ext === '.png') return 'image/png'
    if (ext === '.webp') return 'image/webp'
    return 'image/jpeg'
}

async function upload(slug: string, filePath: string): Promise<void> {
    const ext = path.extname(filePath).toLowerCase()
    const buf = await fs.readFile(filePath)
    const form = new FormData()
    form.append('file', new Blob([buf], { type: contentType(ext) }), `${slug}${ext}`)
    form.append('id', slug)

    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/images/v1`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${API_TOKEN}` },
        body: form,
    })
    const json = (await res.json()) as { success: boolean; errors: { code: number; message: string }[] }

    if (!res.ok) {
        if (json.errors?.[0]?.code === 5409) {
            console.log(`  Already exists: ${slug}`)
            return
        }
        throw new Error(`Upload failed for ${slug}: ${JSON.stringify(json.errors)}`)
    }
    console.log(`  Uploaded: ${slug}`)
}

async function main() {
    const files = await fs.readdir(ORIGINALS_DIR)
    const images = files.filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))

    console.log(`\nUploading ${images.length} images to Cloudflare Images…\n`)

    for (const file of images) {
        const slug = path.basename(file, path.extname(file))
        console.log(`[${images.indexOf(file) + 1}/${images.length}] ${slug}`)
        await upload(slug, path.join(ORIGINALS_DIR, file))
    }

    console.log('\nDone.')
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
