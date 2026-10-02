// POST /api/liity — volunteer sign-up form. Logic and tests: src/lib/volunteers.ts.
import { handleSignup, type VolunteerEnv } from '../../src/lib/volunteers'

export const onRequestPost = ({ env, request }: { env: VolunteerEnv; request: Request }) =>
    handleSignup(request, env, fetch)
