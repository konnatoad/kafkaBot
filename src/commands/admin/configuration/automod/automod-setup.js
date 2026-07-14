const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ChannelType,
  EmbedBuilder,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
  AutoModerationRuleKeywordPresetType,
  AutoModerationActionType,
} = require("discord.js");

const AutoModConfig = require("../../../../schemas/AutoModConfig");
const logger = require("../../../../extra/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("automod-setup")
    .setDescription("turn on automod for this server")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((option) =>
      option
        .setName("log-channel")
        .setDescription("where blocked messages get logged")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option.setName("spam").setDescription("block obvious spam (default on)")
    )
    .addBooleanOption((option) =>
      option
        .setName("profanity")
        .setDescription("use discord's profanity list (default on)")
    )
    .addBooleanOption((option) =>
      option.setName("slurs").setDescription("use discord's slur list (default on)")
    )
    .addBooleanOption((option) =>
      option
        .setName("sexual-content")
        .setDescription("use discord's sexual content list (default off)")
    )
    .addIntegerOption((option) =>
      option
        .setName("mention-limit")
        .setDescription("block messages with more mentions than this (off by default)")
        .setMinValue(1)
        .setMaxValue(50)
    )
    .addStringOption((option) =>
      option
        .setName("custom-words")
        .setDescription("comma separated words to block on top of discord's lists")
    )
    .addBooleanOption((option) =>
      option
        .setName("auto-warn")
        .setDescription("give a /warn whenever automod blocks someone (default off)")
    ),

  run: async ({ interaction }) => {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: "run this inside a server",
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;

    try {
      const existing = await AutoModConfig.findOne({ guildId: guild.id });
      if (existing) {
        return interaction.editReply(
          "automod is already set up here. run `/automod-disable` first if you want to reconfigure it."
        );
      }

      if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.editReply(
          "i need the **Manage Server** permission to set up automod. give me that and try again."
        );
      }

      const logChannel = interaction.options.getChannel("log-channel");
      if (!logChannel.permissionsFor(guild.members.me)?.has("SendMessages")) {
        return interaction.editReply(
          `i can't send messages in <#${logChannel.id}>, pick a channel i actually have access to.`
        );
      }

      const wantSpam = interaction.options.getBoolean("spam") ?? true;
      const wantProfanity = interaction.options.getBoolean("profanity") ?? true;
      const wantSlurs = interaction.options.getBoolean("slurs") ?? true;
      const wantSexual = interaction.options.getBoolean("sexual-content") ?? false;
      const mentionLimit = interaction.options.getInteger("mention-limit");
      const customWordsRaw = interaction.options.getString("custom-words");
      const autoWarn = interaction.options.getBoolean("auto-warn") ?? false;

      const presets = [];
      if (wantProfanity) presets.push(AutoModerationRuleKeywordPresetType.Profanity);
      if (wantSexual) presets.push(AutoModerationRuleKeywordPresetType.SexualContent);
      if (wantSlurs) presets.push(AutoModerationRuleKeywordPresetType.Slurs);

      const customWords = customWordsRaw
        ? customWordsRaw.split(",").map((w) => w.trim()).filter(Boolean)
        : [];

      if (!wantSpam && presets.length === 0 && !mentionLimit && customWords.length === 0) {
        return interaction.editReply("that turns off literally everything, nothing to set up");
      }

      const actions = [
        { type: AutoModerationActionType.BlockMessage },
        {
          type: AutoModerationActionType.SendAlertMessage,
          metadata: { channel: logChannel.id },
        },
      ];
      const reason = `automod setup by ${interaction.user.tag}`;

      const ruleIds = {};
      const enabledSummary = [];

      // rules other than us (manual server setup, or a leftover from a botched disable)
      // count against discord's per-type cap, so check what's already there first
      // instead of just throwing when create() hits the cap
      const existingRules = await guild.autoModerationRules.fetch();
      const hasType = (type) => existingRules.some((rule) => rule.triggerType === type);
      const keywordRuleCount = existingRules.filter(
        (rule) => rule.triggerType === AutoModerationRuleTriggerType.Keyword
      ).size;

      try {
        if (wantSpam) {
          if (hasType(AutoModerationRuleTriggerType.Spam)) {
            enabledSummary.push("spam (already set up on this server, skipped)");
          } else {
            const rule = await guild.autoModerationRules.create({
              name: "kafkaBot - spam",
              eventType: AutoModerationRuleEventType.MessageSend,
              triggerType: AutoModerationRuleTriggerType.Spam,
              actions,
              enabled: true,
              reason,
            });
            ruleIds.spam = rule.id;
            enabledSummary.push("spam");
          }
        }

        if (presets.length > 0) {
          if (hasType(AutoModerationRuleTriggerType.KeywordPreset)) {
            enabledSummary.push("keyword presets (already set up on this server, skipped)");
          } else {
            const rule = await guild.autoModerationRules.create({
              name: "kafkaBot - keyword presets",
              eventType: AutoModerationRuleEventType.MessageSend,
              triggerType: AutoModerationRuleTriggerType.KeywordPreset,
              triggerMetadata: { presets },
              actions,
              enabled: true,
              reason,
            });
            ruleIds.keywordPreset = rule.id;
            enabledSummary.push(
              `keyword presets (${[
                wantProfanity && "profanity",
                wantSexual && "sexual content",
                wantSlurs && "slurs",
              ]
                .filter(Boolean)
                .join(", ")})`
            );
          }
        }

        if (mentionLimit) {
          if (hasType(AutoModerationRuleTriggerType.MentionSpam)) {
            enabledSummary.push("mention spam (already set up on this server, skipped)");
          } else {
            const rule = await guild.autoModerationRules.create({
              name: "kafkaBot - mention spam",
              eventType: AutoModerationRuleEventType.MessageSend,
              triggerType: AutoModerationRuleTriggerType.MentionSpam,
              triggerMetadata: {
                mentionTotalLimit: mentionLimit,
                mentionRaidProtectionEnabled: true,
              },
              actions,
              enabled: true,
              reason,
            });
            ruleIds.mentionSpam = rule.id;
            enabledSummary.push(`mention spam (limit ${mentionLimit})`);
          }
        }

        if (customWords.length > 0) {
          if (keywordRuleCount >= 6) {
            enabledSummary.push("custom words (skipped, this server already has the max keyword rules)");
          } else {
            const rule = await guild.autoModerationRules.create({
              name: "kafkaBot - custom words",
              eventType: AutoModerationRuleEventType.MessageSend,
              triggerType: AutoModerationRuleTriggerType.Keyword,
              triggerMetadata: { keywordFilter: customWords },
              actions,
              enabled: true,
              reason,
            });
            ruleIds.keyword = rule.id;
            enabledSummary.push(`custom words (${customWords.length})`);
          }
        }
        await AutoModConfig.create({
          guildId: guild.id,
          logChannelId: logChannel.id,
          autoWarn,
          ruleIds,
        });
      } catch (err) {
        // something failed partway, don't leave orphaned rules behind
        for (const id of Object.values(ruleIds)) {
          await guild.autoModerationRules.delete(id).catch(() => {});
        }
        throw err;
      }

      const embed = new EmbedBuilder()
        .setColor("Blurple")
        .setTitle("automod is on")
        .setDescription(enabledSummary.map((s) => `- ${s}`).join("\n"))
        .addFields(
          { name: "log channel", value: `<#${logChannel.id}>` },
          { name: "auto-warn", value: autoWarn ? "on" : "off" }
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error(`automod-setup error: ${error}`);
      return interaction.editReply(
        "something broke setting up automod, check my permissions and try again"
      );
    }
  },
};
