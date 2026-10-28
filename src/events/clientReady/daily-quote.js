const cron = require("node-cron");
const logger = require("../../extra/logger");
const {
  sendDailyQuote,
} = require("../../commands/admin/configuration/misc/dailyQuote");

// 09:00 Finnish time all year. It used to be 06:00 UTC, which moved between
// 08:00 and 09:00 with daylight saving.
const POST_AT = "0 9 * * *";
const TIMEZONE = "Europe/Helsinki";

module.exports = (client) => {
  cron.schedule(
    POST_AT,
    async () => {
      logger.info("Sending daily quotes");
      await sendDailyQuote(client);
    },
    { timezone: TIMEZONE },
  );
  logger.info(`Daily quotes scheduled for 09:00 ${TIMEZONE}`);
};
