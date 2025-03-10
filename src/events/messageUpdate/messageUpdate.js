const { Events, EmbedBuilder, AuditLogEvent, Message } = require("discord.js");
const log = require("../../schemas/messageupdate");

module.exports = async (newMessage, message, member) => {
  if (
    !message.guild ||
    !message.author ||
    message.author.bot ||
    !newMessage ||
    message.channelId === "895273892120252437" ||
    newMessage.content === message.content
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
    .setTitle(`Message edited!`)
    .setDescription(
      `This message was edited ${deleteTime} and is being logged for moderative purposes.`
    )
    .addFields({
      name: "Old message",
      value: `> ${newMessage || "no message content"}`,
    })
    .addFields({
      name: "New message",
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
      text: "Message update log",
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
