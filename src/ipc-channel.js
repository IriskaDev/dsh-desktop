import { Buffer } from 'node:buffer';

/**
 * Length-prefixed JSON frames over a duplex byte stream (the stdio fd 3 pipe
 * between the DSH parent and the Electron main process). The protocol is
 * intentionally tiny: 4-byte little-endian byte length + UTF-8 JSON payload.
 */

const HEADER = 4;

export function createFrameStream(socket, onFrame) {
  let pending = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    pending = Buffer.concat([pending, chunk]);
    while (pending.length >= HEADER) {
      const length = pending.readUInt32LE(0);
      if (pending.length < HEADER + length) return;
      const body = pending.subarray(HEADER, HEADER + length);
      pending = pending.subarray(HEADER + length);
      let message;
      try {
        message = JSON.parse(body.toString('utf8'));
      } catch {
        continue;
      }
      onFrame(message);
    }
  });
}

export function sendFrame(socket, message) {
  const body = Buffer.from(JSON.stringify(message), 'utf8');
  const header = Buffer.alloc(HEADER);
  header.writeUInt32LE(body.length, 0);
  socket.write(Buffer.concat([header, body]));
}

/**
 * Parent-side RPC over the fd-3 channel. `handlers.request` answers one
 * fetch-shaped request; `handlers.subscribe` opens an event stream and returns
 * a disposer.
 */
export function createParentIpcChannel(socket, handlers) {
  const subscriptions = new Map();

  createFrameStream(socket, (message) => {
    if (message.type === 'request') {
      void handlers
        .request(message.payload)
        .then((result) => {
          sendFrame(socket, {
            type: 'response',
            id: message.id,
            status: result.status,
            headers: result.headers,
            bodyBase64: result.body.toString('base64')
          });
        })
        .catch((error) => {
          sendFrame(socket, {
            type: 'response',
            id: message.id,
            status: 500,
            headers: {},
            bodyBase64: Buffer.from(
              error instanceof Error ? error.message : String(error)
            ).toString('base64')
          });
        });
      return;
    }
    if (message.type === 'subscribe') {
      const disposer = handlers.subscribe(
        message.stream,
        (frame) => {
          sendFrame(socket, { type: 'event', id: message.id, frame });
        },
        () => {
          subscriptions.delete(message.id);
        }
      );
      subscriptions.set(message.id, disposer);
      return;
    }
    if (message.type === 'unsubscribe') {
      const disposer = subscriptions.get(message.id);
      if (disposer !== undefined) disposer();
    }
  });

  return {
    close() {
      for (const disposer of subscriptions.values()) disposer();
      subscriptions.clear();
      socket.destroy();
    }
  };
}
