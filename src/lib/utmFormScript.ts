/**
 * Copies `utm_source` and `utm_campaign` from the page's own URL into the newsletter form's
 * hidden `fields[utm_source]` / `fields[utm_campaign]` inputs, so MailerLite stores which
 * campaign link the subscriber arrived through (lapanti/lavanti-2027 conversion tracking).
 *
 * Landing page only: nothing is written to cookies or storage, so a reader who clicks on to
 * another page before subscribing is not attributed. Values that are not short slugs are
 * ignored, and Do Not Track leaves the inputs empty.
 *
 * Plain ES5 for `<script is:inline>`; it reads only `window`, `document` and `navigator`, which
 * lets the unit test run it against a happy-dom window.
 */
export const utmFormScript = `(function () {
    var doNotTrack = parseInt(navigator.msDoNotTrack || window.doNotTrack || navigator.doNotTrack, 10) === 1
    if (doNotTrack) return
    var params = new URLSearchParams(window.location.search)
    var keys = ['utm_source', 'utm_campaign']
    for (var i = 0; i < keys.length; i++) {
        var value = (params.get(keys[i]) || '').trim().toLowerCase()
        if (!/^[a-z0-9._-]{1,64}$/.test(value)) continue
        var inputs = document.querySelectorAll('input[name="fields[' + keys[i] + ']"]')
        for (var j = 0; j < inputs.length; j++) inputs[j].value = value
    }
})()`
