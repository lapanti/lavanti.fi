/*
 * GET /signal — 302 to the campaign team's Signal group.
 * Logic and tests: src/lib/signal.ts.
 */
import { handleSignal } from '../src/lib/signal'

export const onRequestGet = () => handleSignal()
