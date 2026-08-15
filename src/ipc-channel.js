import { Buffer } from 'node:buffer';

/**
 * Length-prefixed JSON frames over a duplex byte stream (the stdio fd 3 pipe
 * between the DSH parent and the Electron main process). The protocol is
 * intentionally tiny: 4-byte little-endian byte length + UTF-8 JSON payload.
 */

const HEADER = 4;

export function createFrameStream(socket, onFrame) {
  const chunks = [];
  let buffered = 0;

  // Consume exactly `count` queued bytes without copying whole frames on
  // every data event. Keeping chunks in a queue makes parsing O(total bytes)
  // instead of O(n²) when a large frame arrives in many small TCP chunks.
  function takeBytes(count) {
    if (buffered < count) return null;
    if (chunks.length === 1 && chunks[0].length === count) {
      const buffer = chunks[0];
      chunks.length = 0;
      buffered = 0;
      return buffer;
    }
    if (chunks.length === 1 && chunks[0].length > count) {
      const buffer = chunks[0].subarray(0, count);
      chunks[0] = chunks[0].subarray(count);
      buffered -= count;
      return buffer;
    }
    const buffer = Buffer.allocUnsafe(count);
    let offset = 0;
    while (offset < count) {
      const chunk = chunks[0];
      const need = count - offset;
      if (chunk.length <= need) {
        chunk.copy(buffer, offset);
        offset += chunk.length;
        buffered -= chunk.length;
        chunks.shift();
      } else {
        chunk.copy(buffer, offset, 0, need);
        offset += need;
        buffered -= need;
        chunks[0] = chunk.subarray(need);
      }
    }
    return buffer;
  }

  socket.on('data', (chunk) => {
    if (chunk.length === 0) return;
    chunks.push(chunk);
    buffered += chunk.length;

    while (buffered >= HEADER) {
      const header = takeBytes(HEADER);
      const length = header.readUInt32LE(0);
      if (buffered < length) {
        // Not a complete frame yet; put the header back and wait for more
        // bytes.
        chunks.unshift(header);
        buffered += HEADER;
        return;
      }
      const body = takeBytes(length);
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
