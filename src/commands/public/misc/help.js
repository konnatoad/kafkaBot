const fs = require("fs");
const path = require("path");
const logger = require("../../../extra/logger");
const { witchServers } = require("../../../../config.json");
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

const SUBCOMMAND_TYPES = [
  ApplicationCommandOptionType.Subcommand,
  ApplicationCommandOptionType.SubcommandGroup,
];

/** "`/ban <target-user> [reason]` Bans a user": <required> and [optional] options */
function usage(name, options = [], description) {
  const args = options
    .filter((option) => !SUBCOMMAND_TYPES.includes(option.type))
    .map((option) =>
      option.required ? `<${option.name}>` : `[${option.name}]`,
    );
  const line = `\`${[name, ...args].join(" ")}\``;
  return description ? `${line} ${description}` : line;
}

/** How a command is used: one line per subcommand (groups included), or one for the command */
function usageLines(command) {
  const subcommands = (command.options || []).filter((option) =>
    SUBCOMMAND_TYPES.includes(option.type),
  );
  if (!subcommands.length) return [usage(`/${command.name}`, command.options)];
  return subcommands.flatMap((option) => {
    const name = `/${command.name} ${option.name}`;
    if (option.type === ApplicationCommandOptionType.Subcommand) {
      return [usage(name, option.options, option.description)];
    }
    return option.options.map((sub) =>
      usage(`${name} ${sub.name}`, sub.options, sub.description),
    );
  });
}

/** group -> a help entry per command. Commands only change on restart. */
let entries;
function helpEntries() {
  if (entries) return entries;
  entries = {};
  for (const group of Object.keys(GROUPS)) {
    entries[group] = commandFiles(path.join(COMMANDS_DIR, group)).map(
      (file) => {
        const command = require(file);
        const data = command.data.toJSON();
        return {
          witchOnly: Boolean(command.witchOnly),
          permissions: data.default_member_permissions ?? null,
          // a field per command: one field for the whole page outgrew Discord's 1024 characters
          field: {
            name: `/${data.name}`,
            value: [
              data.description || "No description provided",
              ...usageLines(data),
            ].join("\n"),
          },
        };
      },
    );
  }
  return entries;
}

/**
 * Whether whoever asked can use the command where they asked: its default Discord
 * permission (a role given access in the server's Integrations settings isn't known here)
 * and witchOnly, the same flag validations/witchonly.js checks.
 */
function canUse(entry, interaction) {
  if (entry.witchOnly && !witchServers.includes(interaction.guildId))
    return false;
  if (!entry.permissions) return true;
  return Boolean(interaction.memberPermissions?.has(BigInt(entry.permissions)));
}

/** group -> embeds of PER_PAGE commands each, only the ones this person can use */
function helpPages(interaction) {
  const pages = {};
  for (const [group, { title, color }] of Object.entries(GROUPS)) {
    const commands = helpEntries()[group];
    const fields = commands
      .filter((entry) => canUse(entry, interaction))
      .map((entry) => entry.field);
    const count = Math.ceil(fields.length / PER_PAGE);
    pages[group] = Array.from({ length: count }, (_, page) =>
      new EmbedBuilder()
        .setTitle(`***Commands for ${title}***`)
        .setDescription(
          `Page ${page + 1} of ${count} · \`<required>\` \`[optional]\``,
        )
        .addFields(fields.slice(page * PER_PAGE, (page + 1) * PER_PAGE))
        .setColor(color),
    );
  }
  return pages;
}

function buttons(group, canSwitch) {
  const other = group === "admin" ? "public" : "admin";
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("help_previous")
      .setLabel("Previous")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("help_next")
      .setLabel("Next")
      .setStyle(ButtonStyle.Primary),
  );
  // no switch for someone who can't use any admin command
  if (canSwitch) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId("help_switch")
        .setLabel(`Show ${GROUPS[other].title} Commands`)
        .setStyle(ButtonStyle.Secondary),
    );
  }
  return row;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("list the commands you can use and how they work"),

  async run({ interaction }) {
    const all = helpPages(interaction);
    const canSwitch = all.public.length > 0 && all.admin.length > 0;
    let group = "public";
    let page = 0;
    const view = () => ({
      embeds: [all[group][page]],
      components: [buttons(group, canSwitch)],
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
      if (button.customId === "help_switch" && canSwitch) {
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
