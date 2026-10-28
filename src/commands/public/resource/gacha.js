const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const UserProfile = require("../../../schemas/UserProfile");
const logger = require("../../../extra/logger");
const { claimCooldown, releaseCooldown } = require("../../../utils/cooldowns");
const { randomInt, pickOne } = require("../../../utils/random");

const COST = 5;

const RICE_BALLS = [
  {
    article: "an",
    name: "onigiri",
    emoji: "<:onigiri:1247789847700045864>",
    gold: "<:gold_onigiri:1242492990732112044>",
  },
  {
    article: "a",
    name: "sushi",
    emoji: "<:shushi:1247789962066133002>",
    gold: "<:gold_sushi:1242493139990745151>",
  },
  {
    article: "a",
    name: "gimbap",
    emoji: "<:gimbap:1240412036744216646>",
    gold: "<:gold_gimbap:1242493521890639874>",
  },
  {
    article: "a",
    name: "jumeok-bap",
    emoji: "<:jumeokbap:1240424388260663308>",
    gold: "<:gold_jumeokbap:1242493357926776872>",
  },
  {
    article: "an",
    name: "arancini",
    emoji: "<:arancini:1240412387425910794>",
    gold: "<:gold_arancini:1242493771371778139>",
  },
  {
    article: "a",
    name: "cifantuan",
    emoji: "<:cifantuan:1240420347912654858>",
    gold: "<:gold_cifantuan:1242493645530206372>",
  },
  {
    article: "a",
    name: "zongzi",
    emoji: "<:zongzi:1240412100849832007>",
    gold: "<:gold_zongzi:1242493857577566260>",
  },
];

const withArticle = (ball) => `${ball.article} ${ball.name} ${ball.emoji}`;

// `change` already takes off the cost; the messages show the prize before it
function pullLever() {
  const chance = randomInt(0, 1000);
  if (chance === 4) {
    const ball = pickOne(RICE_BALLS);
    return {
      change: 995,
      cooldownMs: 5 * 60_000,
      message: `Wow! You got a rare golden ${ball.name} ${ball.gold}!\n*+1000 rice grains.*`,
    };
  }
  if (chance > 990) {
    const jammed = pickOne(RICE_BALLS);
    return {
      change: 25,
      cooldownMs: 90_000,
      message: `You got ${withArticle(pickOne(RICE_BALLS))}. \nHuh? A jammed ${jammed.name} ${jammed.emoji} came loose!\n*+30 rice grains.*`,
    };
  }
  if (chance < 400) {
    return {
      change: -COST,
      cooldownMs: 30_000,
      message: "Oh no! The vending machine jammed and you lost your grains.",
    };
  }
  return {
    change: 10,
    cooldownMs: 60_000,
    message: `You got ${withArticle(pickOne(RICE_BALLS))}!\n*+15 rice grains.*`,
  };
}

module.exports = {
  run: async ({ interaction }) => {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: "You can only run this command in a server!",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await interaction.deferReply();
      const userId = interaction.user.id;
      const profile = { userId, Guild: interaction.guild.id };

      if (!(await UserProfile.exists(profile))) {
        await interaction.editReply(
          "You don't have user setup in my database, please run /daily",
        );
        return;
      }

      const outcome = pullLever();
      const left = await claimCooldown(userId, "gacha", outcome.cooldownMs);
      if (left) {
        const { default: prettyMs } = await import("pretty-ms");
        await interaction.editReply(
          `*You can try again in ${prettyMs(left, { secondsDecimalDigits: 0 })}*`,
        );
        return;
      }

      // only pays out if they still have the cost when it's taken
      const paid = await UserProfile.findOneAndUpdate(
        { ...profile, balance: { $gte: COST } },
        { $inc: { balance: outcome.change } },
      );
      if (!paid) {
        await releaseCooldown(userId, "gacha");
        await interaction.editReply("You don't have enough balance to gamble.");
        return;
      }

      await interaction.editReply(outcome.message);
    } catch (error) {
      logger.error(`error handling /gacha: ${error}`);
    }
  },

  data: new SlashCommandBuilder()
    .setName("gacha")
    .setDescription(`Rice gachapon | Cost: ${COST} rice grains.`),
};
