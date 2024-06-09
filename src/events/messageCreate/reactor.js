const { EmbedBuilder } = require("discord.js");
const reactor = require("../../schemas/reactorschema");

module.exports = async (message) => {
  const data = await reactor.findOne({
    Guild: message.guild.id,
    Channel: message.channel.id,
  });
  if (!data) return;

  const emojis = data.Emojis;
  if (!emojis || emojis.length === 0) return;

  for (const emoji of emojis) {
    try {
      await message.react(emoji);
    } catch (err) {
      const owner = await message.guild.members.cache.get(
        message.guild.ownerId
      );

      const embed = new EmbedBuilder()
        .setColor("Blurple")
        .setDescription(
          `Hello there, it looks like I have found an error with the reactor system for your server - **${message.channel}** - and I thought I would bring it to your attention: \`${err}\``
        );

      await owner.send({ embeds: [embed] });
      break; // Stop trying to react if one fails
    }
  }
};
