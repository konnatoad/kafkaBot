const Cooldown = require("../../schemas/Cooldown");
const logger = require("../../extra/logger");

module.exports = () => {
  setInterval(async () => {
    try {
      const cooldowns = await Cooldown.find().select("endsAt");

      for (const cooldown of cooldowns) {
        if (Date.now() < cooldown.endsAt) continue;

        await Cooldown.deleteOne({
          _id: cooldown._id
        });
      }
    } catch (error) {
      logger.error(`error clearing cooldowns: ${error}`);
    }
  }, 3.6e6);
};
