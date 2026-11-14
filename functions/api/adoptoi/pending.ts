// GET /api/adoptoi/pending — the owner inbox behind a bearer token. Logic and tests: src/lib/signAdoptions.ts.
import { type AdoptionEnv, handlePending } from '../../../src/lib/signAdoptions'

export const onRequestGet = ({ env, request }: { env: AdoptionEnv; request: Request }) => handlePending(request, env)
