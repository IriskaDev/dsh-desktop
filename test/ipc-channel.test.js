import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Buffer } from 'node:buffer';
import {
  createFrameStream,
  createParentIpcChannel,
  sendFrame
} from '../src/ipc-channel.js';

function encodeFrame(message) {
  const body = Buffer.from(JSON.stringify(message), 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length, 0);
  return Buffer.concat([header, body]);
}

function decodeFrame(buffer) {
  return JSON.parse(buffer.subarray(4).toString('utf8'));
}

test('frame stream decodes length-prefixed JSON frames', async () => {
  const socket = new EventEmitter();
  const frames = [];
  createFrameStream(socket, (message) => frames.push(message));

  socket.emit('data', encodeFrame({ type: 'hello', id: 1 }));
  socket.emit(
    'data',
    Buffer.concat([encodeFrame({ type: 'a' }), encodeFrame({ type: 'b' })])
  );

  assert.deepEqual(frames, [
    { type: 'hello', id: 1 },
    { type: 'a' },
    { type: 'b' }
  ]);
});

test('parent channel answers requests over the same socket', async () => {
  const socket = new EventEmitter();
  socket.written = [];
  socket.write = (buf) => {
    socket.written.push(buf);
    return true;
  };
  socket.destroy = () => {};

  createParentIpcChannel(socket, {
    request: async (payload) => ({
      status: 200,
      headers: { 'content-type': 'text/plain' },
      body: Buffer.from(`echo:${payload.path}`)
    }),
    subscribe: () => () => {}
  });

  socket.emit(
    'data',
    encodeFrame({
      type: 'request',
      id: 7,
      payload: { method: 'GET', path: '/api/ping', headers: {} }
    })
  );

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(socket.written.length, 1);
  const response = decodeFrame(socket.written[0]);
  assert.equal(response.type, 'response');
  assert.equal(response.id, 7);
  assert.equal(response.status, 200);
  assert.equal(
    Buffer.from(response.bodyBase64, 'base64').toString('utf8'),
    'echo:/api/ping'
  );
});

test('parent channel forwards event frames to subscribers', async () => {
  const socket = new EventEmitter();
  socket.written = [];
  socket.write = (buf) => {
    socket.written.push(buf);
    return true;
  };
  socket.destroy = () => {};

  let sendFrame;
  createParentIpcChannel(socket, {
    request: async () => ({ status: 200, headers: {}, body: Buffer.alloc(0) }),
    subscribe: (stream, onFrame) => {
      assert.equal(stream, 'mux');
      sendFrame = onFrame;
      return () => {};
    }
  });

  socket.emit('data', encodeFrame({ type: 'subscribe', id: 9, stream: 'mux' }));
  sendFrame({ rpcId: 'rpc-1', payload: { type: 'text-delta' } });

  const frame = decodeFrame(socket.written[0]);
  assert.equal(frame.type, 'event');
  assert.equal(frame.id, 9);
  assert.deepEqual(frame.frame, {
    rpcId: 'rpc-1',
    payload: { type: 'text-delta' }
  });
});

test('sendFrame writes a decodable frame', () => {
  const socket = new EventEmitter();
  socket.written = [];
  socket.write = (buf) => {
    socket.written.push(buf);
    return true;
  };

  sendFrame(socket, { type: 'ping', value: 42 });
  assert.equal(socket.written.length, 1);
  assert.deepEqual(decodeFrame(socket.written[0]), { type: 'ping', value: 42 });
});
