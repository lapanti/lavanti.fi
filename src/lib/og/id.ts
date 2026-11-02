/**
 * Maps a canonical page slug (e.g. `"fi/blog/58/talous-korjataan"`) to a filesystem-
 * and URL-safe id used as the `/og/<id>.jpg` route param.
 *
 * The layouts emit the OG image URL from this function and the manifest
 * (`getOgCards`) enumerates the endpoint's static paths from the same function, so the
 * two id sets match by construction — a page can never point at a card the endpoint
 * didn't generate as long as both go through `ogId`.
 */
export const ogId = (slug: string): string =>
    slug
        .replace(/^\/+|\/+$/g, '') // drop leading/trailing slashes
        .replace(/\//g, '__') // path separators → filesystem-safe token
