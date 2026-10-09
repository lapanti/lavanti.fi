// GET /api/suosittele/stats — pending count for the morning brief. Logic and tests: src/lib/recommendationSubmissions.ts.
import { handleStats, type RecommendationEnv } from '../../../src/lib/recommendationSubmissions'

export const onRequestGet = ({ env, request }: { env: RecommendationEnv; request: Request }) =>
    handleStats(request, env)
