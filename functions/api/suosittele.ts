// POST /api/suosittele — recommendation form. Logic and tests: src/lib/recommendationSubmissions.ts.
import { handleSubmit, type RecommendationEnv } from '../../src/lib/recommendationSubmissions'

export const onRequestPost = ({ env, request }: { env: RecommendationEnv; request: Request }) =>
    handleSubmit(request, env, fetch)
