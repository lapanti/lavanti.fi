/*
 * GET /mp — counts the click (hour + campaign link), then 302 to the campaign's MobilePay box.
 * Logic and tests: src/lib/volunteers.ts.
 */
import { handleMobilePay, type VolunteerEnv } from '../src/lib/volunteers'

export const onRequestGet = ({ env, request }: { env: VolunteerEnv; request: Request }) => handleMobilePay(request, env)
