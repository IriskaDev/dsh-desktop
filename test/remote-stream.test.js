import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRemoteStreamFactory } from '../src/remote-stream.js';

test('remote stream factory opens through typertGateway without apiProxy', async () => {
  const gateway = {
    wireStream: {
      async open(endpoint, payload) {
        assert.equal(endpoint, '$events');
        assert.deepEqual(payload, { args: {} });
        return {
          type: 'ready',
          clientId: 'client-1',
          host: { home: 'C:\\Users\\IriskaDev' }
        };
      }
    }
  };
  const ctx = {
    inject(keys, callback) {
      assert.deepEqual(keys, ['typertGateway']);
      callback({ typertGateway: gateway });
    }
  };

  const factory = createRemoteStreamFactory(ctx);
  await factory.ready;
  const frame = await factory.open(
    '$events',
    { args: {} },
    new AbortController().signal
  );

  assert.deepEqual(frame, {
    type: 'ready',
    clientId: 'client-1',
    host: { home: 'C:\\Users\\IriskaDev' }
  });
});

test('remote stream factory rejects when typertGateway is present but has no carrier', async () => {
  const ctx = {
    inject(keys, callback) {
      assert.deepEqual(keys, ['typertGateway']);
      callback({ typertGateway: {} });
    }
  };

  const factory = createRemoteStreamFactory(ctx);
  await factory.ready;
  await assert.rejects(
    factory.open('$events', { args: {} }, new AbortController().signal),
    /stream carrier is unavailable/
  );
});
