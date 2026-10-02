import { Window } from 'happy-dom'
import { describe, expect, it } from 'vitest'

import { utmFormScript } from './utmFormScript'

const FORM = `<form>
    <input name="fields[email]" />
    <input name="fields[utm_source]" type="hidden" value="" />
    <input name="fields[utm_campaign]" type="hidden" value="" />
</form>`

const run = (url: string, doNotTrack: null | string = null) => {
    const window = new Window({ url })
    window.document.body.innerHTML = FORM
    Object.defineProperty(window.navigator, 'doNotTrack', { configurable: true, value: doNotTrack })
    new Function('window', 'document', 'navigator', utmFormScript)(window, window.document, window.navigator)
    const value = (name: string) =>
        (window.document.querySelector(`input[name="fields[${name}]"]`) as unknown as HTMLInputElement).value

    return { campaign: value('utm_campaign'), source: value('utm_source') }
}

describe('utmFormScript', () => {
    it('also fills the plain utm_* inputs of the volunteer form', () => {
        const window = new Window({ url: 'https://lavanti.fi/fi/liity/?utm_source=bluesky&utm_campaign=liity' })
        window.document.body.innerHTML =
            '<form><input name="utm_source" type="hidden" value="" /><input name="utm_campaign" type="hidden" value="" /></form>'
        new Function('window', 'document', 'navigator', utmFormScript)(window, window.document, window.navigator)
        const value = (name: string) =>
            (window.document.querySelector(`input[name="${name}"]`) as unknown as HTMLInputElement).value

        expect([value('utm_source'), value('utm_campaign')]).toEqual(['bluesky', 'liity'])
    })

    it('copies utm_source and utm_campaign from the URL into the hidden inputs', () => {
        expect(run('https://lavanti.fi/fi/blogi/x/?utm_source=linkedin&utm_campaign=datakeskukset')).toEqual({
            campaign: 'datakeskukset',
            source: 'linkedin',
        })
    })

    it('lowercases and trims the values', () => {
        expect(run('https://lavanti.fi/?utm_source=%20LinkedIn%20&utm_campaign=Sote-2026')).toEqual({
            campaign: 'sote-2026',
            source: 'linkedin',
        })
    })

    it('leaves the inputs empty without a tagged URL', () => {
        expect(run('https://lavanti.fi/fi/')).toEqual({ campaign: '', source: '' })
    })

    it('ignores values that are not short slugs', () => {
        const long = 'a'.repeat(65)
        expect(run(`https://lavanti.fi/?utm_source=%3Cscript%3E&utm_campaign=${long}`)).toEqual({
            campaign: '',
            source: '',
        })
    })

    it('fills each key independently', () => {
        expect(run('https://lavanti.fi/?utm_source=bluesky&utm_campaign=bad%20value')).toEqual({
            campaign: '',
            source: 'bluesky',
        })
    })

    it('respects Do Not Track', () => {
        expect(run('https://lavanti.fi/?utm_source=linkedin&utm_campaign=x', '1')).toEqual({ campaign: '', source: '' })
    })
})
