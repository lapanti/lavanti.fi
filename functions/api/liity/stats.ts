// GET /api/liity/stats — aggregate counts behind a bearer token. Logic and tests: src/lib/volunteers.ts.
import { handleStats, type VolunteerEnv } from '../../../src/lib/volunteers'

export const onRequestGet = ({ env, request }: { env: VolunteerEnv; request: Request }) => handleStats(request, env)
