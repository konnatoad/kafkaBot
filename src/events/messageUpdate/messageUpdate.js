const { EmbedBuilder } = require("discord.js");
const log = require("../../schemas/messageupdate");

module.exports = async (oldMessage, newMessage) => {
  if (
    !newMessage.guild ||
    !newMessage.author ||
    newMessage.author.bot ||
    newMessage.channelId === "895273892120252437" ||
    oldMessage.content === newMessage.content
  )
    return;

  const data = await log.findOne({
    Guild: newMessage.guild.id,
  });
  if (!data) return;

  const sendChannel = await newMessage.guild.channels.fetch(data.Channel);
  const attachments = newMessage.attachments.map(
    (attachment) => attachment.url,
  );
  const author = newMessage.author;
  const editTime = `<t:${Math.floor(Date.now() / 1000)}:R>`;

  const embed = new EmbedBuilder()
    .setColor("Blurple")
    .setTitle(`Message edited!`)
    .setDescription(
      `This message was edited ${editTime} and is being logged for moderative purposes.`,
    )
    .addFields({
      name: "Old message",
      value: `> ${oldMessage.content || "no message content"}`,
    })
    .addFields({
      name: "New message",
      value: `> ${newMessage.content || "no message content"}`,
    })
    .addFields({
      name: "Message Author",
      value: `> \`${author.username} (${author.id})\``,
    })
    .addFields({
      name: "Message Channel",
      value: `> ${newMessage.channel} (${newMessage.channel.id})`,
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
