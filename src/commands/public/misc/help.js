const fs = require("fs");
const path = require("path");
const {
  SlashCommandBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Displays list of available commands"),

  async run({ interaction, client }) {
    if (!client.activeEphemeralMessages) {
      client.activeEphemeralMessages = new Map();
    }

    const userId = interaction.user.id;

    // Check if the user already has an active ephemeral message
    if (client.activeEphemeralMessages.has(userId)) {
      return interaction.reply({
        content:
          "You already have an active help message. Please dismiss it and wait ~5min before running the command again.",
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const commandDirectory = path.resolve(__dirname, "../../../commands");
      const commandFiles = readCommandsDirectory(commandDirectory);
      const commands = categorizeCommands(commandFiles, commandDirectory);
      const embeds = createEmbeds(commands);

      if (!embeds.admin.length && !embeds.public.length) {
        return await interaction.editReply({
          content: "No commands found.",
          flags: MessageFlags.Ephemeral,
        });
      }

      let currentGroup = "public"; // Start with public commands
      let currentPage = { admin: 0, public: 0 };
      const uniqueId = `${userId}-${Date.now()}`;

      const row = createButtonRow(currentGroup, uniqueId);

      await interaction.editReply({
        embeds: [embeds[currentGroup][currentPage[currentGroup]]],
        components: [row],
      });

      client.activeEphemeralMessages.set(userId, interaction);

      const collector = interaction.channel.createMessageComponentCollector({
        filter: (i) => i.user.id === userId && i.customId.endsWith(uniqueId),
        time: 300000,
      });

      collector.on("collect", async (buttonInteraction) => {
        const { customId } = buttonInteraction;
        if (
          customId === `previous_button_${uniqueId}` ||
          customId === `next_button_${uniqueId}`
        ) {
          // Handle Previous and Next button clicks
          if (customId === `previous_button_${uniqueId}`) {
            currentPage[currentGroup] =
              (currentPage[currentGroup] - 1 + embeds[currentGroup].length) %
              embeds[currentGroup].length;
          } else if (customId === `next_button_${uniqueId}`) {
            currentPage[currentGroup] =
              (currentPage[currentGroup] + 1) % embeds[currentGroup].length;
          }

          await buttonInteraction.update({
            embeds: [embeds[currentGroup][currentPage[currentGroup]]],
            components: [row],
          });
        } else if (customId === `toggle_group_button_${uniqueId}`) {
          // Handle Show Admin/Public Commands button click
          currentGroup = currentGroup === "admin" ? "public" : "admin";
          currentPage[currentGroup] = 0;
          row.components[2].setLabel(
            `Show ${currentGroup === "admin" ? "Public" : "Admin"} Commands`
          );

          await buttonInteraction.update({
            embeds: [embeds[currentGroup][currentPage[currentGroup]]],
            components: [row],
          });
        }
      });

      collector.on("end", async () => {
        client.activeEphemeralMessages.delete(userId);
        await interaction.editReply({
          embeds: [embeds[currentGroup][currentPage[currentGroup]]],
          components: [],
        });
      });
    } catch (error) {
      console.error("Error processing help command:", error);
      await interaction.editReply({
        content: "An error occurred while processing the help command.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

// Function to recursively read directories
function readCommandsDirectory(directory) {
  const commandFiles = [];
  const files = fs.readdirSync(directory, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.resolve(directory, file.name);
    if (file.isDirectory()) {
      commandFiles.push(...readCommandsDirectory(filePath));
    } else if (file.isFile() && filePath.endsWith(".js")) {
      try {
        const command = require(filePath);
        commandFiles.push({ command, filePath });
      } catch (error) {
        console.error(`Error loading command file ${filePath}:`, error);
      }
    }
  }
  return commandFiles;
}

// Function to categorize commands into groups
function categorizeCommands(commandFiles, commandDirectory) {
  const commands = { admin: [], public: [] };
  for (const { command, filePath } of commandFiles) {
    const relativePath = path.relative(commandDirectory, filePath);
    const mainFolder = relativePath.split(path.sep)[0];
    if (commands[mainFolder]) {
      commands[mainFolder].push(command);
    }
  }
  return commands;
}

// Function to create embeds for each group of commands
function createEmbeds(commands) {
  const embeds = { admin: [], public: [] };
  for (const [mainFolder, cmds] of Object.entries(commands)) {
    let embedsArray = [];
    let totalCommands = cmds.length;
    let totalPages = Math.ceil(totalCommands / 5); // Assuming 5 commands per page
    for (let currentPage = 0; currentPage < totalPages; currentPage++) {
      const embed = new EmbedBuilder()
        .setTitle(`***Commands for ${capitalize(mainFolder)}***`)
        .setDescription(`Page ${currentPage + 1} of ${totalPages}`);

      let commandList = ""; // Declare commandList variable here
      for (
        let i = currentPage * 5;
        i < Math.min((currentPage + 1) * 5, totalCommands);
        i++
      ) {
        const cmd = cmds[i];
        commandList += `**/${cmd.data.name}**\n${
          cmd.data.description || "No description provided"
        }\n\n`; // Add an empty line after each command
      }

      embed.addFields({
        name: "***Commands***", // Ensure there's an empty line after "Commands"
        value: commandList,
      });

      if (mainFolder === "public") {
        embed.setColor("#0099ff"); // Blue color for public commands
      } else {
        embed.setColor("#ff9999"); // Red color for admin commands
      }

      embedsArray.push(embed);
    }
    embeds[mainFolder] = embedsArray;
  }
  return embeds;
}

// Helper function to create the button row
function createButtonRow(currentGroup, uniqueId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`previous_button_${uniqueId}`)
      .setLabel("Previous")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`next_button_${uniqueId}`)
      .setLabel("Next")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`toggle_group_button_${uniqueId}`)
      .setLabel(
        `Show ${currentGroup === "admin" ? "Public" : "Admin"} Commands`
      )
      .setStyle(ButtonStyle.Secondary)
  );
}

// Helper function to capitalize a string
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
