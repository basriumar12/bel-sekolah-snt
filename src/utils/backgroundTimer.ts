/**
 * Precision Background Timer Manager using Web Worker
 * Protects timekeeping against browser throttling when tabs are in background, minimized, or inactive.
 */

const WORKER_SCRIPT = `
let timerId = null;
let intervalMs = 500;

self.onmessage = function(e) {
  const data = e.data;
  if (!data) return;

  if (data.type === 'START') {
    if (data.interval) intervalMs = data.interval;
    if (timerId) clearInterval(timerId);
    timerId = setInterval(function() {
      self.postMessage({ type: 'TICK', timestamp: Date.now() });
    }, intervalMs);
    self.postMessage({ type: 'TICK', timestamp: Date.now() });
  } else if (data.type === 'STOP') {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }
};
`;

export type TimerTickCallback = (timestamp: number) => void;

export class BackgroundTimer {
  private worker: Worker | null = null;
  private fallbackIntervalId: any = null;
  private listeners: Set<TimerTickCallback> = new Set();
  private isRunning: boolean = false;
  private intervalMs: number = 500;
  private isWorkerSupported: boolean = typeof Worker !== 'undefined';

  constructor(intervalMs: number = 500) {
    this.intervalMs = intervalMs;
  }

  private initWorker(): boolean {
    if (!this.isWorkerSupported) return false;
    if (this.worker) return true;

    try {
      // First try creating worker via inline Blob URL to avoid origin/path issues
      const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      this.worker = new Worker(workerUrl);

      this.worker.onmessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'TICK') {
          const ts = event.data.timestamp || Date.now();
          this.notify(ts);
        }
      };

      this.worker.onerror = (err) => {
        console.warn('Web Worker error, falling back to interval:', err);
        this.destroyWorker();
        this.startFallback();
      };

      return true;
    } catch (e) {
      console.warn('Could not initialize Web Worker Blob, trying public file:', e);
      try {
        this.worker = new Worker('/bell-worker.js');
        this.worker.onmessage = (event: MessageEvent) => {
          if (event.data && event.data.type === 'TICK') {
            const ts = event.data.timestamp || Date.now();
            this.notify(ts);
          }
        };
        return true;
      } catch (err2) {
        console.warn('Public file worker failed too, using fallback interval:', err2);
        return false;
      }
    }
  }

  private destroyWorker() {
    if (this.worker) {
      try {
        this.worker.postMessage({ type: 'STOP' });
        this.worker.terminate();
      } catch {
        // ignore
      }
      this.worker = null;
    }
  }

  private startFallback() {
    if (this.fallbackIntervalId) return;
    this.fallbackIntervalId = setInterval(() => {
      this.notify(Date.now());
    }, this.intervalMs);
  }

  private stopFallback() {
    if (this.fallbackIntervalId) {
      clearInterval(this.fallbackIntervalId);
      this.fallbackIntervalId = null;
    }
  }

  private notify(timestamp: number) {
    this.listeners.forEach((fn) => fn(timestamp));
  }

  public subscribe(callback: TimerTickCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public start() {
    this.isRunning = true;
    const workerOk = this.initWorker();

    if (workerOk && this.worker) {
      this.stopFallback();
      this.worker.postMessage({ type: 'START', interval: this.intervalMs });
    } else {
      this.startFallback();
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.worker) {
      try {
        this.worker.postMessage({ type: 'STOP' });
      } catch {
        // ignore
      }
    }
    this.stopFallback();
  }

  public destroy() {
    this.stop();
    this.destroyWorker();
    this.listeners.clear();
  }

  public usingWorker(): boolean {
    return !!this.worker;
  }
}

export const globalBackgroundTimer = new BackgroundTimer(500);
