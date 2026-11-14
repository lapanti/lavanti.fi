// POST /api/adoptoi/viesti — the adopter's message and payer name. Logic and tests: src/lib/signAdoptions.ts.
import { type AdoptionEnv, handleMessage } from '../../../src/lib/signAdoptions'

export const onRequestPost = ({ env, request }: { env: AdoptionEnv; request: Request }) => handleMessage(request, env)
