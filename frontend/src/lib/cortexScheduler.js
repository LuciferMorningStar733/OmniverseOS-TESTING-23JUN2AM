/**
 * cortexScheduler.js — Cortex Timed Reminder & Scheduler Engine
 * OmniverseOS Cortex Intelligence Layer
 *
 * Pure frontend scheduler using setTimeout + localStorage persistence.
 * Jobs survive page reloads: on re-hydration, elapsed jobs fire immediately
 * with a "missed reminder" notification.
 *
 * CMD tag interface (parsed by cmdTagParser.js):
 *   [CMD:SCHEDULE:{"id":"...","title":"...","delay_ms":60000,"recur":"none|daily|weekly"}]
 */

const LS_KEY = "cortex_scheduler_jobs";

/**
 * @typedef {Object} SchedulerJob
 * @property {string}  id         — unique job ID
 * @property {string}  title      — human-readable reminder title
 * @property {number}  createdAt  — epoch ms when scheduled
 * @property {number}  triggerAt  — epoch ms when it should fire
 * @property {string}  recur      — "none" | "daily" | "weekly"
 * @property {boolean} fired      — true after first fire (non-recurring)
 */

class CortexScheduler {
  constructor() {
    /** @type {Map<string, { job: SchedulerJob, timerId: ReturnType<typeof setTimeout> }>} */
    this._timers = new Map();
    /** Callback set externally by the OS: (job) => void */
    this._onFire = null;
  }

  /** Set the callback invoked when a job fires */
  setOnFire(cb) {
    this._onFire = cb;
  }

  /** Persist all jobs to localStorage */
  _save() {
    const jobs = [...this._timers.values()].map((e) => e.job);
    localStorage.setItem(LS_KEY, JSON.stringify(jobs));
  }

  /** Load jobs from localStorage */
  _load() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    } catch {
      return [];
    }
  }

  /** Schedule a single job. Replaces any existing job with the same id. */
  schedule({ id, title, delay_ms, recur = "none" }) {
    // Cancel existing job with this id
    this.cancel(id, false);

    const now = Date.now();
    const triggerAt = now + delay_ms;

    /** @type {SchedulerJob} */
    const job = { id, title, createdAt: now, triggerAt, recur, fired: false };
    const timerId = setTimeout(() => this._fire(id), delay_ms);
    this._timers.set(id, { job, timerId });
    this._save();
    return job;
  }

  /** Cancel a job by id */
  cancel(id, persist = true) {
    const entry = this._timers.get(id);
    if (entry) {
      clearTimeout(entry.timerId);
      this._timers.delete(id);
      if (persist) this._save();
    }
  }

  /** Cancel ALL jobs */
  cancelAll() {
    for (const id of this._timers.keys()) this.cancel(id, false);
    this._save();
  }

  /** List all active jobs sorted by triggerAt */
  listJobs() {
    return [...this._timers.values()]
      .map((e) => e.job)
      .sort((a, b) => a.triggerAt - b.triggerAt);
  }

  /** Fire a job — calls the onFire callback then handles recurrence */
  _fire(id) {
    const entry = this._timers.get(id);
    if (!entry) return;
    const { job } = entry;
    job.fired = true;

    this._onFire?.(job);

    if (job.recur === "daily") {
      // Re-schedule 24 hours from the original trigger time
      const newDelay = 24 * 60 * 60 * 1000;
      const newJob = {
        ...job,
        fired: false,
        createdAt: Date.now(),
        triggerAt: Date.now() + newDelay,
      };
      clearTimeout(entry.timerId);
      const timerId = setTimeout(() => this._fire(id), newDelay);
      this._timers.set(id, { job: newJob, timerId });
      this._save();
    } else if (job.recur === "weekly") {
      const newDelay = 7 * 24 * 60 * 60 * 1000;
      const newJob = {
        ...job,
        fired: false,
        createdAt: Date.now(),
        triggerAt: Date.now() + newDelay,
      };
      clearTimeout(entry.timerId);
      const timerId = setTimeout(() => this._fire(id), newDelay);
      this._timers.set(id, { job: newJob, timerId });
      this._save();
    } else {
      // One-shot — remove after firing
      this._timers.delete(id);
      this._save();
    }
  }

  /**
   * Re-hydrate jobs from localStorage on app startup.
   * Jobs whose triggerAt is in the past fire immediately with a "missed" flag.
   */
  hydrate() {
    const stored = this._load();
    const now = Date.now();

    for (const job of stored) {
      if (job.fired && job.recur === "none") continue; // already done

      const remaining = job.triggerAt - now;

      if (remaining <= 0) {
        // Missed — fire immediately with special context
        const missedJob = { ...job, missed: true };
        const timerId = setTimeout(() => this._fire(job.id), 0);
        this._timers.set(job.id, { job: missedJob, timerId });
      } else {
        // Still pending — re-schedule with remaining time
        const timerId = setTimeout(() => this._fire(job.id), remaining);
        this._timers.set(job.id, { job, timerId });
      }
    }
  }

  /** Format a job's remaining time as a human string */
  formatRemaining(job) {
    const ms = job.triggerAt - Date.now();
    if (ms <= 0) return "now";
    const secs = Math.floor(ms / 1000);
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (remMins === 0) return `${hrs}h`;
    return `${hrs}h ${remMins}m`;
  }
}

// Singleton
export const cortexScheduler = new CortexScheduler();
export default cortexScheduler;
