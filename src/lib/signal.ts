/* Public invite to the campaign team's Signal group. Invite links rotate, so the redirect is a 302. */
export const SIGNAL_GROUP_URL =
    'https://signal.group/#CjQKIMBnuqaASCjSTEAHyZKPyzCkSgU7haXFc7PUG8HwnycbEhALvBi8KyB-Hh8nZj26cSBt'

/** GET /signal — 302 to the team Signal group. */
export const handleSignal = (): Response =>
    new Response(null, { headers: { 'Cache-Control': 'no-store', Location: SIGNAL_GROUP_URL }, status: 302 })
