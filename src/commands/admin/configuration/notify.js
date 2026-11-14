const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

const youtube = require("../../../notify/youtube");
const twitch = require("../../../notify/twitch");

const data = new SlashCommandBuilder()
  .setName("notify")
  .setDescription("YouTube upload and Twitch live notifications")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommandGroup(youtube.subcommandGroup)
  .addSubcommandGroup(twitch.subcommandGroup);

const subcommands = {
  youtube: { add: youtube.add, remove: youtube.remove },
  twitch: { add: twitch.add, remove: twitch.remove },
};

module.exports = { data, subcommands };
