const path = require("path");
const { inspect } = require("node:util");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { createLogger, format, transports } = require("winston");
const DiscordLogTransport = require("../utils/discordLogTransport");
const { combine, timestamp, colorize, printf } = format;

// winston only keeps an extra argument when it's an Error (it adds err.message
// itself), so logger.error("failed:", err.response?.data) printed just "failed:"
const extraArgs = format((info) => {
  const extras = (info[Symbol.for("splat")] ?? []).filter(
    (extra) => !(extra instanceof Error),
  );
  if (extras.length) {
    const text = extras.map((extra) =>
      typeof extra === "string" ? extra : inspect(extra, { depth: 4 }),
    );
    info.message = [info.message, ...text].join(" ");
  }
  return info;
});

const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

const logger = createLogger({
  level: "info",
  format: combine(
    extraArgs(),
    colorize(),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    logFormat,
  ),
  transports: [new transports.Console()],
});

// Ship logs to the Discord #logs channel; errors ping LOG_PING_USER_ID
if (process.env.LOG_WEBHOOK_URL) {
  logger.add(
    new DiscordLogTransport({
      webhookUrl: process.env.LOG_WEBHOOK_URL,
      pingUserId: process.env.LOG_PING_USER_ID,
    }),
  );
}

module.exports = logger;
