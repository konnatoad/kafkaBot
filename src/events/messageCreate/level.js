const { EmbedBuilder } = require("discord.js");
const levelSchema = require("../../schemas/level");
const UserProfile = require("../../schemas/UserProfile");
const logger = require("../../extra/logger");
const { xpIgnoredChannels } = require("../../../config.json");

module.exports = async (message) => {
  const { guild, author } = message;

  if (!guild || author.bot || xpIgnoredChannels.includes(message.channelId))
    return;

  try {
    let Data = await levelSchema.findOne({
      Guild: guild.id,
      User: author.id,
    });

    if (!Data) {
      Data = await levelSchema.create({
        Guild: guild.id,
        User: author.id,
        XP: 0,
        Level: 0,
      });
    }

    let userProfile = await UserProfile.findOne({
      userId: author.id,
      Guild: guild.id,
    });

    if (!userProfile) {
      userProfile = await UserProfile.create({
        userId: author.id,
        Guild: guild.id,
        balance: 25,
      });
    }

    const channel = message.channel;

    const give = 1;

    const data = Data;

    if (!data) return;

    const requiredXP = data.Level * data.Level * 20 + 20;

    if (data.XP + give >= requiredXP) {
      data.XP += give;
      data.Level += 1;
      userProfile.balance += 50;
      await data.save();
      await userProfile.save();

      if (!channel) return;

      const me = guild.members.me;
      if (!channel.permissionsFor(me)?.has("SendMessages")) return;

      const embed = new EmbedBuilder()
        .setColor("Blurple")
        .setDescription(`**${author}, you have reached level ${data.Level}!**`);

      await channel.send({ embeds: [embed] });
    } else {
      data.XP += give;
      await data.save();
    }
  } catch (error) {
    logger.error(error);
  }
};
