const { Events, EmbedBuilder } = require("discord.js");
const log = require("../../schemas/deletemsglog");

module.exports = async (message) => {
  if (
    !message.guild ||
    !message.author ||
    message.author.bot ||
    !message ||
    message.channelId === "895273892120252437"
  )
    return;

  var data = await log.findOne({
    Guild: message.guild.id,
  });
  if (!data) return;

  var sendChannel = await message.guild.channels.fetch(data.Channel);
  var attachments = await message.attachments.map(
    (attachment) => attachment.url
  );
  var member = message.author;
  var deleteTime = `<t:${Math.floor(Date.now() / 1000)}:R>`;

  const embed = new EmbedBuilder()
    .setColor("Blurple")
    .setTitle(`New message deleted!`)
    .setDescription(
      `This message was deleted ${deleteTime} and is being logged for moderative purposes`
    )
    .addFields({
      name: "Message content",
      value: `> ${message.content || "no message content"}`,
    })
    .addFields({
      name: "Message Author",
      value: `> \`${member.username} (${member.id})\``,
    })
    .addFields({
      name: "Message Channel",
      value: `> ${message.channel} (${message.channel.id})`,
    })
    .setFooter({
      text: "Message delete log",
      iconURL: "https://vou.s-ul.eu/ts9RQjxl",
    })
    .setTimestamp();

  if (attachments.length > 0) {
    embed.addFields({
      name: "Message attachments",
      value: attachments.join(" , "),
    });
  }

  await sendChannel.send({
    embeds: [embed],
  });
};
