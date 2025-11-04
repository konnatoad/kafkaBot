const Cooldown = require("../../schemas/Cooldown");

module.exports = () => {
  setInterval(async () => {
    try {
      const cooldowns = await Cooldown.find().select("endsAt");

      for (const cooldown of cooldowns) {
        if (Date.now() < cooldown.endsAt) return;

        await Cooldown.deleteOne({
          _id: cooldown._id
        });
      }
    } catch (error) {
      console.error(`error clearing cooldowns: ${error}`);
    }
  }, 3.6e6);
};
