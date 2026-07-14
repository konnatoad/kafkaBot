const warningSchema = require("../schemas/warnschema");

async function addWarning({ guildId, userId, userTag, executerId, executerTag, reason }) {
  const entry = { ExecuterId: executerId, ExecuterTag: executerTag, Reason: reason };

  return warningSchema.findOneAndUpdate(
    { GuildID: guildId, UserID: userId, UserNAME: userTag },
    { $push: { Content: entry } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

module.exports = { addWarning };
