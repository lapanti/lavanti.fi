// GET /api/suosittele/pending — pending submissions behind a bearer token. Logic and tests: src/lib/recommendationSubmissions.ts.
import { handlePending, type RecommendationEnv } from '../../../src/lib/recommendationSubmissions'

export const onRequestGet = ({ env, request }: { env: RecommendationEnv; request: Request }) =>
    handlePending(request, env)
