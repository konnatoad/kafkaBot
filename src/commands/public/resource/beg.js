const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const UserProfile = require("../../../schemas/UserProfile");
const logger = require("../../../extra/logger");
const { claimCooldown } = require("../../../utils/cooldowns");
const { randomInt, pickOne } = require("../../../utils/random");

const COOLDOWN_MS = 3 * 60 * 1000;
/** Out of 100. */
const WIN_CHANCE = 40;

// followed by how long is left
const TOO_EAGER = [
  "Now now, let's not be too eager.",
  "You're not ready yet.",
  "Maybe you should rethink about that one for a bit longer.",
  "Hold on a minute!",
  "Being so over eager isn't good! Calm yourself!",
  "This is a perfect time to rethink your life decisions and what made you to behave this way.",
  "You should cool off for a little while!",
  "Try again a while later!",
  "Oh you're so eager! Still, you should wait a while.",
  "At least let me breathe for a minute first!",
  "Hold on, I'm busy!",
  "Ugh. Not now!",
  "Already?",
  "I get that you want me but you have to wait a while!",
];

const REFUSALS = [
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

// followed by the amount won
const REWARDS = [
  "Oh what a good puppy! Here's your reward.",
  "Oh, I'm impressed!",
  "That was adorable!",
  "Fine! since you're trying so hard.",
  "I can almost see how hard your nonexistent tail is wagging right now!",
  "Ugh, fine! If it stops you from bothering me.",
  "Fine but just this once, okay?",
  "Oh I love it when you do that!",
  "Oh wow! That was surprisingly good!",
  "You're pathetic! I like it.",
  "Oh, you learned a new trick? Good puppy!",
  "Fine, but I'm going to tell everyone you did that!",
  "You know what? I'm feeling generous today!",
  "You caught me in a good mood!",
];

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

      if (
        !(await UserProfile.exists({ userId, Guild: interaction.guild.id }))
      ) {
        await interaction.editReply(
          "You don't have user setup in my database, please run /daily.",
        );
        return;
      }

      const left = await claimCooldown(userId, "beg", COOLDOWN_MS);
      if (left) {
        const { default: prettyMs } = await import("pretty-ms");
        const wait = prettyMs(left, { secondsDecimalDigits: 0 });
        await interaction.editReply(`${pickOne(TOO_EAGER)} \n*${wait}*`);
        return;
      }

      if (randomInt(0, 100) > WIN_CHANCE) {
        await interaction.editReply(pickOne(REFUSALS));
        return;
      }

      const amount = randomInt(1, 50);
      await UserProfile.updateOne(
        { userId, Guild: interaction.guild.id },
        { $inc: { balance: amount } },
      );
      await interaction.editReply(
        `${pickOne(REWARDS)} \n*+${amount} rice grains.*`,
      );
    } catch (error) {
      logger.error(`error handling /beg: ${error}`);
    }
  },

  data: new SlashCommandBuilder()
    .setName("beg")
    .setDescription("Beg for a chance to get some extra currency."),
};
