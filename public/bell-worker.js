/**
 * Web Worker for Precision Background School Bell Scheduler
 * Runs in a separate background thread immune to browser tab throttling / freezing.
 */

let timerId = null;
let intervalMs = 500;

self.onmessage = function (e) {
  const data = e.data;
  if (!data) return;

  switch (data.type) {
    case 'START':
      if (data.interval) {
        intervalMs = data.interval;
      }
      if (timerId) {
        clearInterval(timerId);
      }
      timerId = setInterval(() => {
        self.postMessage({
          type: 'TICK',
          timestamp: Date.now(),
        });
      }, intervalMs);
      // Immediately emit first tick
      self.postMessage({
        type: 'TICK',
        timestamp: Date.now(),
      });
      break;

    case 'STOP':
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
      break;

    case 'PING':
      self.postMessage({
        type: 'PONG',
        timestamp: Date.now(),
      });
      break;
  }
};
