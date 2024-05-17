require("dotenv").config();
const {
  Client,
  IntentsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});
// all the role id and labels you wanna have on ur buttons
const roles = [
  {
    id: "1235688092375978114",
    label: "red",
  },
  {
    id: "1235688146868637816",
    label: "green",
  },
  {
    id: "1235688199129399317",
    label: "black",
  },
  {
    id: "1236925158443188285",
    label: "admin",
  },
];

// on ready status sends button message to specified channel

client.on("ready", async (c) => {
  try {
    const channel = await client.channels.cache.get(
      process.env.ROLE_CHANNEL_ID
    );
    if (!channel) return;

    const row = new ActionRowBuilder();

    roles.forEach((role) => {
      row.components.push(
        new ButtonBuilder()
          .setCustomId(role.id)
          .setLabel(role.label)
          .setStyle(ButtonStyle.Primary)
      );
    });
    //text that the bot will say above buttons
    await channel.send({
      content: "claim or remove a role",
      components: [row],
    });
    process.exit();
  } catch (error) {
    console.log(error);
  }
});

client.login(process.env.TOKEN);
