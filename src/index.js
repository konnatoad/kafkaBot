const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { Client, IntentsBitField, Partials } = require("discord.js");
const mongoose = require("mongoose");
const { CommandHandler } = require("djs-commander");

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

const REQUIRED_ENV = ["TOKEN", "MONGODB_URI", "DEV_ID", "TESTSERVER"];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length) {
  console.error(`❌ Missing required environment variables: ${missingEnv.join(", ")}`);
  process.exit(1);
}

const OPTIONAL_ENV = ["BUG", "FEEDBACK", "TWITCH_CLIENT_ID", "TWITCH_ACCESS_TOKEN", "YOUTUBE_API_KEY"];
const missingOpt = OPTIONAL_ENV.filter((key) => !process.env[key]);
if (missingOpt.length) console.warn(`⚠️  Optional env vars not set (features may be disabled): ${missingOpt.join(", ")}`);

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Successfully connected to MongoDB!");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    process.exit(1);
  }

  client.login(process.env.TOKEN);
})();

async function shutdown(signal) {
  console.log(`\n${signal} received, shutting down...`);
  client.destroy();
  await mongoose.disconnect();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
