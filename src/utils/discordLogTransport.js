const Transport = require("winston-transport");

const ANSI = /\x1b\[[0-9;]*m/g;
const MAX_LEN = 1900; // Discord caps content at 2000 chars, leave room for code fences + ping
const FLUSH_MS = 2000;
const PING_COOLDOWN_MS = 60_000;

// Batches log lines into code blocks and posts them to a Discord webhook; errors ping PING_USER_ID
class DiscordLogTransport extends Transport {
  constructor({ webhookUrl, pingUserId, ...opts }) {
    super(opts);
    this.webhookUrl = webhookUrl;
    this.pingUserId = pingUserId;
    this.queue = [];
    this.pendingPing = false;
    this.lastPing = 0;
    this.sending = false;
    setInterval(() => this.flush(), FLUSH_MS).unref();
  }

  log(info, callback) {
    const level = String(info.level).replace(ANSI, "");
    const stack = info.stack && !String(info.message).includes(info.stack) ? `\n${info.stack}` : "";
    const line = `${info.timestamp ?? new Date().toISOString()} [${level}]: ${String(info.message).replace(ANSI, "")}${stack}`;
    this.queue.push(line);
    if (level === "error") this.pendingPing = true;
    callback();
  }

  async flush() {
    if (this.sending || !this.queue.length) return;
    this.sending = true;
    try {
      const ping = this.pendingPing && this.pingUserId && Date.now() - this.lastPing > PING_COOLDOWN_MS;
      this.pendingPing = false;
      if (ping) this.lastPing = Date.now();

      const lines = this.queue.splice(0);
      const chunks = [];
      let current = "";
      for (let line of lines) {
        if (line.length > MAX_LEN) line = `${line.slice(0, MAX_LEN - 15)}…[truncated]`;
        if (current.length + line.length + 1 > MAX_LEN) {
          chunks.push(current);
          current = "";
        }
        current += (current ? "\n" : "") + line;
      }
      if (current) chunks.push(current);

      for (const [i, chunk] of chunks.entries()) {
        const mention = ping && i === 0 ? `<@${this.pingUserId}>\n` : "";
        await this.post(`${mention}\`\`\`\n${chunk.replace(/```/g, "ʼʼʼ")}\n\`\`\``);
      }
    } catch {
      // Never let log shipping crash the bot; the console transport still has everything
    } finally {
      this.sending = false;
    }
  }

  async post(content, attempt = 0) {
    const res = await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        allowed_mentions: { users: this.pingUserId ? [this.pingUserId] : [] },
      }),
    });
    if (res.status === 429 && attempt < 3) {
      const { retry_after = 1 } = await res.json().catch(() => ({}));
      await new Promise((r) => setTimeout(r, retry_after * 1000));
      return this.post(content, attempt + 1);
    }
  }
}

module.exports = DiscordLogTransport;
