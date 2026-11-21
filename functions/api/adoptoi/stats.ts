// GET /api/adoptoi/stats — adoption counts behind a bearer token. Logic and tests: src/lib/signAdoptions.ts.
import { type AdoptionEnv, handleStats } from '../../../src/lib/signAdoptions'

export const onRequestGet = ({ env, request }: { env: AdoptionEnv; request: Request }) => handleStats(request, env)
