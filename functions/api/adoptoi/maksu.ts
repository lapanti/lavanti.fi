/*
 * GET /api/adoptoi/maksu (switched on? / ?ref= payment state) and POST (start a MobilePay payment).
 * Logic and tests: src/lib/signAdoptions.ts.
 */
import { type AdoptionEnv, handlePayStart, handlePayStatus } from '../../../src/lib/signAdoptions'

export const onRequestGet = ({ env, request }: { env: AdoptionEnv; request: Request }) =>
    handlePayStatus(request, env, fetch)

export const onRequestPost = ({ env, request }: { env: AdoptionEnv; request: Request }) =>
    handlePayStart(request, env, fetch)
