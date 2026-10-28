/**
 * Screen Wake Lock API Manager
 * Keeps the device display and system awake during school hours so the bell never freezes or sleeps.
 */

class ScreenWakeLockManager {
  private sentinel: any = null;
  private isRequested: boolean = false;
  private listeners: Set<(active: boolean) => void> = new Set();

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  }

  public isActive(): boolean {
    return !!this.sentinel && !this.sentinel.released;
  }

  public subscribe(listener: (active: boolean) => void): () => void {
    this.listeners.add(listener);
    listener(this.isActive());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const active = this.isActive();
    this.listeners.forEach((fn) => fn(active));
  }

  public async acquire(): Promise<boolean> {
    this.isRequested = true;
    if (!this.isSupported()) {
      return false;
    }

    try {
      if (!this.sentinel || this.sentinel.released) {
        // Request screen wake lock
        this.sentinel = await (navigator as any).wakeLock.request('screen');

        this.sentinel.addEventListener('release', () => {
          this.notify();
          // If released by OS (e.g. user minimized or system low power) and we still want it,
          // re-acquire when visibility returns
          if (this.isRequested && document.visibilityState === 'visible') {
            this.reacquire();
          }
        });

        this.notify();
        return true;
      }
      return true;
    } catch (err) {
      console.warn('Screen Wake Lock could not be acquired:', err);
      this.notify();
      return false;
    }
  }

  public async release(): Promise<void> {
    this.isRequested = false;
    if (this.sentinel && !this.sentinel.released) {
      try {
        await this.sentinel.release();
      } catch {
        // ignore
      }
      this.sentinel = null;
    }
    this.notify();
  }

  private async reacquire(): Promise<void> {
    if (!this.isRequested) return;
    try {
      if (!this.sentinel || this.sentinel.released) {
        this.sentinel = await (navigator as any).wakeLock.request('screen');
        this.sentinel.addEventListener('release', () => {
          this.notify();
          if (this.isRequested && document.visibilityState === 'visible') {
            this.reacquire();
          }
        });
        this.notify();
      }
    } catch (e) {
      // Re-acquire may fail if document is not visible yet
    }
  }

  public handleVisibilityChange(): void {
    if (document.visibilityState === 'visible' && this.isRequested) {
      this.reacquire();
    }
  }
}

export const screenWakeLock = new ScreenWakeLockManager();

// Automatically attach visibility listener
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    screenWakeLock.handleVisibilityChange();
  });
  window.addEventListener('focus', () => {
    screenWakeLock.handleVisibilityChange();
  });
}
