const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  MessageFlags,
} = require("discord.js");
const { getChangelog, versionPage } = require("../../../utils/changelog");
const logger = require("../../../extra/logger");
const OPEN_FOR = 5 * 60 * 1000;

/** older and newer, grayed out at the ends; page 0 is the newest ver */
function buttons(index, total) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("changelog_older")
      .setLabel("Older")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(index >= total - 1),
    new ButtonBuilder()
      .setCustomId("changelog_newer")
      .setLabel("Newer")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(index <= 0),
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("changelog")
    .setDescription("what changed in each version of kafkaBot"),

  async run({ interaction }) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    let versions;
    try {
      versions = await getChangelog();
    } catch (error) {
      logger.error("/changelog: couldn't load the changelog:", error);
      return interaction.editReply("couldn't load the changelog right now, try again later");
    }
    let index = 0;
    const view = () => ({
      embeds: [versionPage(versions[index], index, versions.length)],
      components: [buttons(index, versions.length)],
    });
    const message = await interaction.editReply(view());
    const collector = message.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: OPEN_FOR,
    });
    collector.on("collect", async (button) => {
      if (button.customId === "changelog_older") {
        index = Math.min(index + 1, versions.length - 1);
      }
      if (button.customId === "changelog_newer") index = Math.max(index - 1, 0);
      await button
        .update(view())
        .catch((error) => logger.error("/changelog: failed to change page:", error));
    });
    collector.on("end", () =>
      interaction.editReply({ components: [] }).catch((error) => {
        if (![10008, 50027].includes(error.code)) {
          logger.error("/changelog: failed to remove the buttons:", error);
        }
      }),
    );
  },
};
