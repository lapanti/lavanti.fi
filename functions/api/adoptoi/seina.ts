// GET /api/adoptoi/seina — the public adopters wall. Logic and tests: src/lib/signAdoptions.ts.
import { type AdoptionEnv, handleWall } from '../../../src/lib/signAdoptions'

export const onRequestGet = ({ env }: { env: AdoptionEnv }) => handleWall(env)
