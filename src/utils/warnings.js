const warningSchema = require("../schemas/warnschema");

// Warnings used to be stored per username too, so someone who renamed has more
// than one document. Everything here goes by user ID and reads all of them.
async function addWarning({
  guildId,
  userId,
  userTag,
  executerId,
  executerTag,
  reason,
}) {
  const entry = {
    ExecuterId: executerId,
    ExecuterTag: executerTag,
    Reason: reason,
  };

  return warningSchema.findOneAndUpdate(
    { GuildID: guildId, UserID: userId },
    { $push: { Content: entry }, $set: { UserNAME: userTag } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function findWarnings(guildId, userId) {
  const documents = await warningSchema.find({
    GuildID: guildId,
    UserID: userId,
  });
  return documents.flatMap((document) => document.Content);
}

/** Returns how many warnings were removed. */
async function clearWarnings(guildId, userId) {
  const count = (await findWarnings(guildId, userId)).length;
  await warningSchema.deleteMany({ GuildID: guildId, UserID: userId });
  return count;
}

module.exports = { addWarning, findWarnings, clearWarnings };
