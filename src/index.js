import { randomUUID } from 'node:crypto'

export const name = 'desktop'
export const inject = ['agents']

/**
 * The desktop surface: drive the `main` agent and stream its session events to
 * stdout as JSON Lines. A native window later consumes this exact protocol.
 *
 * JSONL events:
 *   {"type":"turn/start","turn":N}
 *   {"type":"delta","kind":"text"|"reasoning","text":"..."}
 *   {"type":"message"}
 *   {"type":"turn/end","reason":"completed"|...}
 */
export function apply(ctx, config = {}) {
  const { sessionId } = ctx.desktopStartup

  const emit = (event) => {
    process.stdout.write(`${JSON.stringify(event)}\n`)
  }

  let started = false

  const start = (agent) => {
    if (started) return
    if (agent.id !== sessionId) return
    started = true

    ctx.on('session/event', (session, event) => {
      if (session !== agent.session) return
      switch (event.type) {
        case 'turn/start':
          emit({ type: 'turn/start', turn: event.data.turn })
          break
        case 'assistant/chunk': {
          const chunk = event.data.chunk
          if (chunk.type === 'text-delta') {
            emit({ type: 'delta', kind: 'text', text: chunk.text })
          } else if (chunk.type === 'reasoning-delta') {
            emit({ type: 'delta', kind: 'reasoning', text: chunk.text })
          }
          break
        }
        case 'assistant/message':
          emit({ type: 'message' })
          break
        case 'turn/end': {
          emit({
            type: 'turn/end',
            reason: event.data.reason?.kind,
            error: event.data.reason?.error?.message,
          })
          // One-shot spike: dispose the tree and exit once the turn settles,
          // with a bounded fallback in case dispose hangs.
          const timer = setTimeout(() => process.exit(0), 2000)
          void ctx.root.fiber.dispose().then(() => {
            clearTimeout(timer)
            process.exit(0)
          })
          break
        }
        default:
          break
      }
    })

    // First user turn from config.prompt, else from stdin (pipe/redirect).
    const send = (text) => {
      const trimmed = text.trim()
      if (!trimmed) return
      agent.followup({
        id: randomUUID(),
        role: 'user',
        content: [{ type: 'text', text: trimmed }],
        source: { kind: 'user' },
      })
    }

    if (config.prompt) {
      send(config.prompt)
    } else {
      let buffer = ''
      process.stdin.setEncoding('utf8')
      process.stdin.on('data', (chunk) => { buffer += chunk })
      process.stdin.on('end', () => send(buffer))
      process.stdin.resume()
    }
  }

  ctx.on('agent/created', ({ agent }) => start(agent))
  const existing = ctx.agents.roots().find((agent) => agent.id === sessionId)
  if (existing) start(existing)
}
