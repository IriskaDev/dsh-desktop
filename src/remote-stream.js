/**
 * Remote stream access for the desktop surface.
 *
 * DSH 0.1.2 retired the old `apiProxy` event source. The desktop host now
 * opens Remote streams through the Typert Gateway's wire-carrier; the
 * renderer talks to a multiplexed WebSocket-like bridge over IPC.
 */
export function createRemoteStreamFactory(ctx) {
  let gateway;
  const ready = new Promise((resolve, reject) => {
    try {
      ctx.inject(['typertGateway'], (next) => {
        gateway = next.typertGateway;
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });

  return {
    ready,
    async open(endpoint, payload, signal) {
      await ready;
      if (gateway?.wireStream?.open === undefined) {
        throw new Error(
          'remote stream: Typert Gateway stream carrier is unavailable'
        );
      }
      return gateway.wireStream.open(endpoint, payload, signal);
    }
  };
}
