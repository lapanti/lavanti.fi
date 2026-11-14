// POST /api/adoptoi — sign adoption form. Logic and tests: src/lib/signAdoptions.ts.
import { type AdoptionEnv, handleSubmit } from '../../src/lib/signAdoptions'

export const onRequestPost = ({ env, request }: { env: AdoptionEnv; request: Request }) =>
    handleSubmit(request, env, fetch)
