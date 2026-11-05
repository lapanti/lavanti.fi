/*
 * / — 302 to /fi/ or /sv/ by Accept-Language, replacing the noindex JS language picker.
 * Every method, so HEAD-only link checkers and crawlers get the redirect too.
 * Logic and tests: src/lib/rootRedirect.ts.
 */
import { handleRoot } from '../src/lib/rootRedirect'

export const onRequest = ({ request }: { request: Request }) => handleRoot(request)
