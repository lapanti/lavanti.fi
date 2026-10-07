import { readFileSync } from 'node:fs'

/** Pixel width from the first SOF marker of a baseline or progressive JPEG. */
export const jpegWidth = (file: string): number => {
    const buf = readFileSync(file)
    let offset = 2
    while (offset < buf.length) {
        if (buf[offset] !== 0xff) throw new Error(`${file}: bad JPEG marker at ${offset}`)
        const marker = buf[offset + 1]
        const length = buf.readUInt16BE(offset + 2)
        if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7)) {
            return buf.readUInt16BE(offset + 7)
        }
        offset += 2 + length
    }
    throw new Error(`${file}: no SOF marker`)
}
