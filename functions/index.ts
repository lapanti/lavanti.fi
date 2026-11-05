/*
 * GET / — 302 to /fi/ or /sv/ by Accept-Language, replacing the noindex JS language picker.
 * Logic and tests: src/lib/rootRedirect.ts.
 */
import { handleRoot } from '../src/lib/rootRedirect'

export const onRequestGet = ({ request }: { request: Request }) => handleRoot(request)
