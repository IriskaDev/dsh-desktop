import { test } from 'node:test';
import assert from 'node:assert/strict';
import { name, apply } from '../src/startup.js';

const CONFIGURED_AGENT_IDENTITIES_KEY = 'configuredAgentIdentities';

function makeCtx() {
  const provided = {};
  return {
    provide(key, value) {
      provided[key] = value;
    },
    provided
  };
}

test('module name is desktop-startup', () => {
  assert.equal(name, 'desktop-startup');
});

test('apply provides configuredAgentIdentities with a fresh session id', () => {
  const ctx = makeCtx();
  apply(ctx);

  const identities = ctx.provided[CONFIGURED_AGENT_IDENTITIES_KEY];
  assert.ok(identities, 'configuredAgentIdentities should be provided');
  assert.ok(identities.main, 'main identity should exist');
  assert.match(identities.main.id, /^desktop-session-[\w-]+$/);
  assert.equal(identities.main.resume, false);
});

test('apply provides desktopStartup consistent with the session id', () => {
  const ctx = makeCtx();
  apply(ctx);

  const identities = ctx.provided[CONFIGURED_AGENT_IDENTITIES_KEY];
  const startup = ctx.provided.desktopStartup;
  assert.ok(startup, 'desktopStartup should be provided');
  assert.equal(startup.sessionId, identities.main.id);
});
