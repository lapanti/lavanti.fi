// GET /api/suosittele/photo/:id — a pending submission's photo. Logic and tests: src/lib/recommendationSubmissions.ts.
import { handlePhoto, type RecommendationEnv } from '../../../../src/lib/recommendationSubmissions'

export const onRequestGet = ({
    env,
    params,
    request,
}: {
    env: RecommendationEnv
    params: { id: string }
    request: Request
}) => handlePhoto(request, env, params.id)
