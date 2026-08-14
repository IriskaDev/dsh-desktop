import { randomUUID } from 'node:crypto'

export const name = 'desktop-startup'

// Public context key the agent-loop reads to fix each configured agent's
// session identity (see @deepseek-ai/dsh-agent-loop). String value confirmed
// from the agent-loop source; it is stable and public.
const CONFIGURED_AGENT_IDENTITIES_KEY = 'configuredAgentIdentities'

/**
 * Mint a fresh session identity for the `main` agent and expose it as the
 * `desktopStartup` service both the agent-loop and surface rows inject.
 */
export function apply(ctx) {
  const sessionId = `desktop-session-${randomUUID()}`
  ctx.provide(CONFIGURED_AGENT_IDENTITIES_KEY, {
    main: { id: sessionId, resume: false },
  })
  ctx.provide('desktopStartup', { sessionId })
}
