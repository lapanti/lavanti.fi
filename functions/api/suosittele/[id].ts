// DELETE /api/suosittele/:id — approve and reject remove a submission. Logic and tests: src/lib/recommendationSubmissions.ts.
import { handleDelete, type RecommendationEnv } from '../../../src/lib/recommendationSubmissions'

export const onRequestDelete = ({
    env,
    params,
    request,
}: {
    env: RecommendationEnv
    params: { id: string }
    request: Request
}) => handleDelete(request, env, params.id)
