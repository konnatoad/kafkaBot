require("dotenv").config();

const { Client, IntentsBitField, Partials } = require("discord.js");

const mongoose = require("mongoose");

const { CommandHandler } = require("djs-commander");

const path = require("path");

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.GuildModeration,
  ],
  partials: [
    Partials.Channel,
    Partials.GuildMember,
    Partials.Message,
    Partials.Reaction,
  ],
});

new CommandHandler({
  client,
  commandsPath: path.join(__dirname, "commands"),
  eventsPath: path.join(__dirname, "events"),
  validationsPath: path.join(__dirname, "validations"),
  functions: path.join(__dirname, "functions"),
});

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("connected to DB.");

    client.login(process.env.TOKEN);
  } catch (error) {
    console.log(`Error: ${error}`);
  }
})();
