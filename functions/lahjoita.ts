/*
 * GET /lahjoita — counts the click (hour + campaign link), then 302 to the party's donation form.
 * Logic and tests: src/lib/volunteers.ts.
 */
import { handleDonate, type VolunteerEnv } from '../src/lib/volunteers'

export const onRequestGet = ({ env, request }: { env: VolunteerEnv; request: Request }) => handleDonate(request, env)
