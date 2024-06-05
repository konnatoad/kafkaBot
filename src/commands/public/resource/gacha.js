/** @format */

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const UserProfile = require("../../../schemas/UserProfile");
const Cooldown = require("../../../schemas/Cooldown");

function getRandomNumber(x, y) {
  const range = y - x + 1;
  const randomNumber = Math.floor(Math.random() * range);
  return randomNumber + x;
}

function getRandomrice(x, y) {
  const ricegnat = y - x + 1;
  return ricegnat + x;
}

module.exports = {
  deleted: false,
  run: async ({ interaction }) => {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: "You can only run this command in a server!",
        ephemeral: true,
      });
      return;
    }

    try {
      const riceballs = [
        "an onigiri <:onigiri:1247789847700045864>",
        "a sushi <:shushi:1247789962066133002>",
        "a gimbap <:gimbap:1240412036744216646>",
        "a jumeok-bap <:jumeokbap:1240424388260663308>",
        "an arancini <:arancini:1240412387425910794>",
        "a cifantuan <:cifantuan:1240420347912654858>",
        "a zongzi <:zongzi:1240412100849832007>",
      ];

      const riceballer = [
        "onigiri <:onigiri:1247789847700045864>",
        "sushi <:shushi:1247789962066133002>",
        "gimbap <:gimbap:1240412036744216646>",
        "jumeok-bap <:jumeokbap:1240424388260663308>",
        "arancini <:arancini:1240412387425910794>",
        "cifantuan <:cifantuan:1240420347912654858>",
        "zongzi <:zongzi:1240412100849832007>",
      ];

      const goldballers = [
        "onigiri <:gold_onigiri:1242492990732112044>",
        "sushi <:gold_sushi:1242493139990745151>",
        "gimbap <:gold_gimbap:1242493521890639874>",
        "jumeok-bap <:gold_jumeokbap:1242493357926776872>",
        "arancini <:gold_arancini:1242493771371778139>",
        "cifantuan <:gold_cifantuan:1242493645530206372>",
        "zongzi <:gold_zongzi:1242493857577566260>",
      ];

      const randomrice =
        riceballs[Math.floor(Math.random() * riceballs.length)];

      const ricegnat =
        riceballer[Math.floor(Math.random() * riceballer.length)];

      const singsong =
        goldballers[Math.floor(Math.random() * goldballers.length)];

      await interaction.deferReply();

      const commandName = "gacha";
      const userId = interaction.user.id;

      let cooldown = await Cooldown.findOne({
        userId,
        commandName,
      });

      let userProfile = await UserProfile.findOne({
        userId,
        Guild: interaction.guild.id,
      }).select("userId balance");

      if (!userProfile) {
        interaction.editReply(
          `You don't have user setup in my database, please run /daily`
        );
        return;
      }

      if (5 > userProfile.balance) {
        interaction.editReply("You don't have enough balance to gamble.");
        return;
      }

      if (cooldown && Date.now() < cooldown.endsAt) {
        const { default: prettyMs } = await import("pretty-ms");

        await interaction.editReply({
          content: `*You can try again in ${prettyMs(
            cooldown.endsAt - Date.now(),
            { secondsDecimalDigits: 0 }
          )}*`,
        });
        return;
      }

      if (!cooldown) {
        cooldown = new Cooldown({
          userId,
          commandName,
        });
      }

      const chance = getRandomNumber(0, 1000);

      if (chance === 4) {
        userProfile.balance += 495;
        cooldown.endsAt = Date.now() + 300000;

        await Promise.all([cooldown.save(), userProfile.save()]);

        await interaction.editReply({
          content: `Wow! You got a rare golden ${singsong}!\n*+500 rice grains.*`,
        });
        return;
      }

      if (chance > 990) {
        userProfile.balance += 25;
        cooldown.endsAt = Date.now() + 90000;

        await Promise.all([cooldown.save(), userProfile.save()]);

        await interaction.editReply({
          content: `You got ${randomrice}. \nHuh? A jammed ${ricegnat} came loose!\n*+30 rice grains.*`,
        });
        return;
      }

      if (chance < 400) {
        userProfile.balance -= 5;
        cooldown.endsAt = Date.now() + 90000;

        await Promise.all([cooldown.save(), userProfile.save()]);

        await interaction.editReply({
          content:
            "Oh no! The vending machine jammed and you lost your grains.",
        });
        return;
      } else {
        userProfile.balance += 10;
        cooldown.endsAt = Date.now() + 90000;

        await Promise.all([cooldown.save(), userProfile.save()]);

        await interaction.editReply({
          content: `You got ${randomrice}!\n*+15 rice grains.*`,
        });
        return;
      }
    } catch (error) {
      console.log(`Error handling /gacha: ${error}`);
    }
  },

  data: new SlashCommandBuilder()
    .setName("gacha")
    .setDescription("Rice gachapon | Cost: 5 rice grains."),
};
