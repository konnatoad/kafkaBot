const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const Cooldown = require("../../../schemas/Cooldown");
const UserProfile = require("../../../schemas/UserProfile");

function getRandomNumber(x, y) {
  const range = y - x + 1;
  const randomNumber = Math.floor(Math.random() * range);
  return randomNumber + x;
}

module.exports = {
  deleted: false,
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

      const commandName = "beg";
      const userId = interaction.user.id;

      let cooldown = await Cooldown.findOne({
        userId,
        commandName,
      });

      //COOLDOWN

      if (cooldown && Date.now() < cooldown.endsAt) {
        const { default: prettyMs } = await import("pretty-ms");
        const cdoptions = [
          `Now now, let's not be too eager. \n*${prettyMs(
            cooldown.endsAt - Date.now(),
            { secondsDecimalDigits: 0 }
          )}*`,
          `You're not ready yet. \n*${prettyMs(cooldown.endsAt - Date.now(), {
            secondsDecimalDigits: 0,
          })}*`,
          `Maybe you should rethink about that one for a bit longer. \n*${prettyMs(
            cooldown.endsAt - Date.now(),
            { secondsDecimalDigits: 0 }
          )}*`,
          `Hold on a minute! \n*${prettyMs(cooldown.endsAt - Date.now(), {
            secondsDecimalDigits: 0,
          })}*`,
          `Being so over eager isn't good! Calm yourself! \n*${prettyMs(
            cooldown.endsAt - Date.now(),
            { secondsDecimalDigits: 0 }
          )}*`,
          `This is a perfect time to rethink your life decisions and what made you to behave this way. \n*${prettyMs(
            cooldown.endsAt - Date.now(),
            { secondsDecimalDigits: 0 }
          )}*`,
          `You should cool off for a little while! \n*${prettyMs(
            cooldown.endsAt - Date.now(),
            { secondsDecimalDigits: 0 }
          )}*`,
          `Try again a while later! \n*${prettyMs(
            cooldown.endsAt - Date.now(),
            { secondsDecimalDigits: 0 }
          )}*`,
          `Oh you're so eager! Still, you should wait a while. \n*${prettyMs(
            cooldown.endsAt - Date.now(),
            { secondsDecimalDigits: 0 }
          )}*`,
          `At least let me breathe for a minute first! \n*${prettyMs(
            cooldown.endsAt - Date.now(),
            { secondsDecimalDigits: 0 }
          )}*`,
          `Hold on, I'm busy! \n*${prettyMs(cooldown.endsAt - Date.now(), {
            secondsDecimalDigits: 0,
          })}*`,
          `Ugh. Not now! \n*${prettyMs(cooldown.endsAt - Date.now(), {
            secondsDecimalDigits: 0,
          })}*`,
          `Already? \n*${prettyMs(cooldown.endsAt - Date.now(), {
            secondsDecimalDigits: 0,
          })}*`,
          `I get that you want me but you have to wait a while! \n*${prettyMs(
            cooldown.endsAt - Date.now(),
            { secondsDecimalDigits: 0 }
          )}*`,
        ];
        const randomcooldown =
          cdoptions[Math.floor(Math.random() * cdoptions.length)];

        await interaction.editReply({
          content: `${randomcooldown}`,
        });
        return;
      }

      if (!cooldown) {
        cooldown = new Cooldown({
          userId,
          commandName,
        });
      }

      let userProfile = await UserProfile.findOne({
        userId,
        Guild: interaction.guild.id,
      }).select("userId balance");

      if (!userProfile) {
        interaction.editReply({
          content: `You don't have user setup in my database, please run /daily.`,
        });
        return;
      }

      const chance = getRandomNumber(0, 100);

      //LOSS

      if (chance > 40) {
        const lossoptions = [
          "Do I look that easy to you? Try harder!",
          "You should kneel and beg harder if you want a reward!",
          "Bark more for me, won't you.",
          "Yes! Yes! More!",
          "That was pathetic!",
          "You're pathetic!",
          "You have to try harder than that!",
          "No.",
          "You should be worshipping me!",
          "Oh you want it so bad, don't you?",
          "Less begging, more pegging!",
          "Are you done?",
          "Aww, poor you. Stay poor!",
          "You should be more sincere when doing that!",
          "Did you really just... No, surely not?",
          "Ew, gross!",
          "Oh you're a funny one! Wait, you were serious?",
          "What am I, a charity?",
          "You should be grateful I even gave you a chance!",
          "Lick my boots and maybe I'll reconsider.",
          "Grovel at my feet!",
          "Did you perhaps miss out on motherly love when you were a child?",
          "Why would you even try that?",
          "So you've just thrown away your self-respect huh?",
          "What did you even hope to achieve with that?",
          "You're making me uncomfortable...",
          "You have some deep rooted issues you need to sort out.",
          "Have you considered not doing that?",
          "I'm not sure what's more disturbing, the fact you did that or the fact you thought it would work.",
          "Are you that desperate? Oh well, I'm hardly surprised.",
          "No! Quiet, sit!",
          "I'm gonna have to say no. Nice try though!",
          "You're not even trying, are you?",
          "You're not even trying, are you? I hope not.",
          "I'm not sure what's more pathetic, you or your attempt.",
          "Does your family know this is what you do on your free time?",
          "Don't you have any shame?",
          "It's interesting how you have no value as a human and yet you keep devaluing yourself with your actions.",
          "You do realize everyone's gonna know you said that, right?",
          "This is getting old.",
          "You've got to be more creative next time!",
          "I'm not sure what's more sad, you or your life choices.",
          "Simp!",
          "You caught me in a bad mood!",
          "Are you aware how dumb you look right now?",
          "Bark for me!",
          "Meow for me!",
          "Fatherless behaviour.",
          "Reconsider.",
          "You're not even worth my time.",
        ];
        const randomloss =
          lossoptions[Math.floor(Math.random() * lossoptions.length)];
        await interaction.editReply({
          content: `${randomloss}`,
        });

        cooldown.endsAt = Date.now() + 180000;
        await cooldown.save();
        return;
      }

      const amount = getRandomNumber(1, 50);

      //REWARDS

      userProfile.balance += amount;
      cooldown.endsAt = Date.now() + 180000;
      const winnerchicken = [
        `Oh what a good puppy! Here's your reward. \n*+${amount} rice grains.*`,
        `Oh, I'm impressed! \n*+${amount} rice grains.*`,
        `That was adorable! \n*+${amount} rice grains.*`,
        `Fine! since you're trying so hard. \n*+${amount} rice grains.*`,
        `I can almost see how hard your nonexistent tail is wagging right now! \n*+${amount} rice grains.*`,
        `Ugh, fine! If it stops you from bothering me. \n*+${amount} rice grains.*`,
        `Fine but just this once, okay? \n*+${amount} rice grains.*`,
        `Oh I love it when you do that! \n*+${amount} rice grains.*`,
        `Oh wow! That was surprisingly good! \n*+${amount} rice grains.*`,
        `You're pathetic! I like it. \n*+${amount} rice grains.*`,
        `Oh, you learned a new trick? Good puppy! \n*+${amount} rice grains.*`,
        `Fine, but I'm going to tell everyone you did that! \n*+${amount} rice grains.*`,
        `You know what? I'm feeling generous today! \n*+${amount} rice grains.*`,
        `You caught me in a good mood! \n*+${amount} rice grains.*`,
      ];
      const randomwin =
        winnerchicken[Math.floor(Math.random() * winnerchicken.length)];

      await Promise.all([cooldown.save(), userProfile.save()]);

      await interaction.editReply({
        content: `${randomwin}`,
      });
    } catch (error) {
      console.log(`Error handling /beg: ${error}`);
    }
  },

  data: new SlashCommandBuilder()
    .setName("beg")
    .setDescription("Beg for a chance to get some extra currency."),
};
