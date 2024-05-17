const { EmbedBuilder } = require("discord.js");
const levelSchema = require("../../schemas/level");
const UserProfile = require("../../schemas/UserProfile");

module.exports = async (message) => {
  const { guild, author } = message;

  if (
    !guild ||
    author.bot ||
    message.channelId === "449527843148267520" ||
    message.channelId === "1068114218320138271" ||
    message.channelId === "449527843148267520" ||
    message.channelId === "527903078553485312" ||
    message.channelId === "1069003237967011882" ||
    message.channelId === "727634115238559815" ||
    message.channelId === "461246929519640576" ||
    message.channelId === "449531223702896651" ||
    message.channelId === "584825921274511376" ||
    message.channelId === "509506521193906218" ||
    message.channelId === "895273892120252437" ||
    message.guild.id === "721847737339084865"
  )
    return;

  try {
    const Data = await levelSchema.findOne({
      Guild: guild.id,
      User: author.id,
    });

    if (!Data) {
      levelSchema.create({
        Guild: guild.id,
        User: author.id,
        XP: 0,
        Level: 0,
      });
    }

    let userProfile = await UserProfile.findOne({
      userId: author.id,
    });

    if (!userProfile) {
      userProfile = new UserProfile({
        userId: author.id,
        balance: 0
      });
    }

    const channel = message.channel;

    const give = 1;

    const data = await levelSchema.findOne({
      Guild: guild.id,
      User: author.id,
    });

    if (!data) return;

    const requiredXP = data.Level * data.Level * 20 + 20;

    if (data.XP + give >= requiredXP) {
      data.XP += give;
      data.Level += 1;
      userProfile.balance += 50;
      await data.save();
      await userProfile.save();

      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor("Blurple")
        .setDescription(`**${author}, you have reached level ${data.Level}!**`);

      channel.send({ embeds: [embed] });
    } else {
      data.XP += give;
      data.save();
    }
  } catch (error) {
    console.log(error);
  }
};
