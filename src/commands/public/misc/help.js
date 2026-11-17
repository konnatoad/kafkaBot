const fs = require("fs");
const path = require("path");
const logger = require("../../../extra/logger");
const {
  SlashCommandBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  MessageFlags,
  ApplicationCommandOptionType,
} = require("discord.js");

const COMMANDS_DIR = path.join(__dirname, "../..");
const PER_PAGE = 5;
const GROUPS = {
  public: { title: "Public", color: "#0099ff" },
  admin: { title: "Admin", color: "#ff9999" },
};

function commandFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return commandFiles(file);
    return entry.name.endsWith(".js") ? [file] : [];
  });
}

/** one line per subcommand, groups included: "`/welcome setup` Choose the channel..." */
function subcommandLines(command) {
  return (command.options || []).flatMap((option) => {
    if (option.type === ApplicationCommandOptionType.Subcommand) {
      return [`\`/${command.name} ${option.name}\` ${option.description}`];
    }
    if (option.type === ApplicationCommandOptionType.SubcommandGroup) {
      return option.options.map(
        (sub) =>
          `\`/${command.name} ${option.name} ${sub.name}\` ${sub.description}`,
      );
    }
    return [];
  });
}

/** group -> embeds of PER_PAGE commands each. Commands only change on restart. */
let pages;
function helpPages() {
  if (pages) return pages;
  pages = {};
  for (const [group, { title, color }] of Object.entries(GROUPS)) {
    const commands = commandFiles(path.join(COMMANDS_DIR, group)).map((file) =>
      require(file).data.toJSON(),
    );
    const count = Math.ceil(commands.length / PER_PAGE);
    pages[group] = Array.from({ length: count }, (_, page) => {
      // a field per command: one field for the whole page outgrew Discord's 1024 characters
      const fields = commands
        .slice(page * PER_PAGE, (page + 1) * PER_PAGE)
        .map((command) => ({
          name: `/${command.name}`,
          value: [
            command.description || "No description provided",
            ...subcommandLines(command),
          ].join("\n"),
        }));
      return new EmbedBuilder()
        .setTitle(`***Commands for ${title}***`)
        .setDescription(`Page ${page + 1} of ${count}`)
        .addFields(fields)
        .setColor(color);
    });
  }
  return pages;
}

function buttons(group) {
  const other = group === "admin" ? "public" : "admin";
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("help_previous")
      .setLabel("Previous")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("help_next")
      .setLabel("Next")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("help_switch")
      .setLabel(`Show ${GROUPS[other].title} Commands`)
      .setStyle(ButtonStyle.Secondary),
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Displays list of available commands"),

  async run({ interaction }) {
    const all = helpPages();
    let group = "public";
    let page = 0;
    const view = () => ({
      embeds: [all[group][page]],
      components: [buttons(group)],
    });

    // collected on the reply itself, so several help messages can be open at once
    const reply = await interaction.reply({
      ...view(),
      flags: MessageFlags.Ephemeral,
      withResponse: true,
    });
    const collector = reply.resource.message.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 5 * 60 * 1000,
    });

    collector.on("collect", async (button) => {
      const count = all[group].length;
      if (button.customId === "help_previous")
        page = (page - 1 + count) % count;
      if (button.customId === "help_next") page = (page + 1) % count;
      if (button.customId === "help_switch") {
        group = group === "admin" ? "public" : "admin";
        page = 0;
      }
      await button
        .update(view())
        .catch((error) => logger.error("/help: failed to change page:", error));
    });

    collector.on("end", () =>
      interaction.editReply({ components: [] }).catch((error) => {
        // the help message was dismissed (10008) or its token ran out (50027)
        if (![10008, 50027].includes(error.code)) {
          logger.error("/help: failed to remove buttons:", error);
        }
      }),
    );
  },
};
