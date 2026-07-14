const warningSchema = require("../schemas/warnschema");

async function addWarning({ guildId, userId, userTag, executerId, executerTag, reason }) {
  let data = await warningSchema.findOne({
    GuildID: guildId,
    UserID: userId,
    UserNAME: userTag,
  });

  const entry = { ExecuterId: executerId, ExecuterTag: executerTag, Reason: reason };

  if (!data) {
    data = new warningSchema({
      GuildID: guildId,
      UserID: userId,
      UserNAME: userTag,
      Content: [entry],
    });
  } else {
    data.Content.push(entry);
  }

  await data.save();
  return data;
}

module.exports = { addWarning };
