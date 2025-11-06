class JobQueue {
  constructor(handler, opts = {}) {
    this.handler = handler;
    this.maxRetries = opts.maxRetries ?? 2;
    this.baseDelayMs = opts.baseDelayMs ?? 1000;
    this.queue = [];
    this.running = false;
  }
  add(item) {
    this.queue.push({ item, attempts: 0 });
    if (!this.running) this._drain();
  }
  async _drain() {
    this.running = true;
    while (this.queue.length) {
      const job = this.queue.shift();
      try {
        await this.handler(job.item);
      } catch (e) {
        job.attempts += 1;
        if (job.attempts <= this.maxRetries) {
          const delay = this.baseDelayMs * Math.pow(2, job.attempts - 1);
          await new Promise(r => setTimeout(r, delay));
          this.queue.unshift(job);
        } else {
          // give up for this job
        }
      }
    }
    this.running = false;
  }
}

module.exports = { JobQueue };

