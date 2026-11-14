/*
 * POST /api/adoptoi/:id (approve, reject, message moderation, printed) and DELETE (revoke).
 * Logic and tests: src/lib/signAdoptions.ts.
 */
import { type AdoptionEnv, handleAction, handleRevoke } from '../../../src/lib/signAdoptions'

interface Context {
    env: AdoptionEnv
    params: { id: string }
    request: Request
}

export const onRequestPost = ({ env, params, request }: Context) => handleAction(request, env, params.id)

export const onRequestDelete = ({ env, params, request }: Context) => handleRevoke(request, env, params.id)
