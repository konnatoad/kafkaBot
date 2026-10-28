/** Total XP needed to go from `level` to the next one. XP is never reset on level-up. */
const xpForNextLevel = (level) => level * level * 20 + 20;

module.exports = { xpForNextLevel };
