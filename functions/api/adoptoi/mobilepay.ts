// POST /api/adoptoi/mobilepay — the Vipps MobilePay webhook. Logic and tests: src/lib/signAdoptions.ts.
import { type AdoptionEnv, handleMobilePayWebhook } from '../../../src/lib/signAdoptions'

export const onRequestPost = ({ env, request }: { env: AdoptionEnv; request: Request }) =>
    handleMobilePayWebhook(request, env, fetch)
