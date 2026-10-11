const PermissionAlert = require("../schemas/PermissionAlert");
const logger = require("../extra/logger");

const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const readable = (perm) => perm.replace(/([a-z])([A-Z])/g, "$1 $2");

// Goes through the logger, which ships to the Discord #logs webhook
function report(level, text) {
  logger[level](`permission-alert: ${text}`);
}

async function alertMissingPermissions(guild, channel, missing, feature) {
  const key = `${feature}:${channel.id}`;
  const where = `guild "${guild.name}" (${guild.id}), ${feature} channel #${channel.name} (${channel.id})`;
  const cutoff = new Date(Date.now() - COOLDOWN_MS);

  try {
    await PermissionAlert.updateOne(
      { guildId: guild.id, key, lastSentAt: { $lt: cutoff } },
      { $set: { lastSentAt: new Date(), lastResult: "pending", lastDetail: null } },
      { upsert: true },
    );
  } catch (err) {
    if (err.code !== 11000) throw err;
    const prev = await PermissionAlert.findOne({ guildId: guild.id, key }).lean();
    report(
      "info",
      `skipped for ${where}, last attempt ${prev?.lastSentAt?.toISOString()} (result: ${prev?.lastResult})`,
    );
    return "cooldown";
  }
  const record = (result, detail = null) =>
    PermissionAlert.updateOne(
      { guildId: guild.id, key },
      { $set: { lastResult: result, lastDetail: detail } },
    );
  const owner = await guild.fetchOwner().catch(() => null);
  if (!owner) {
    report("warn", `could not fetch owner for ${where}`);
    await record("owner_not_found");
    return "owner_not_found";
  }
  const ownerLabel = `${owner.user.username} (${owner.id})`;
  try {
    await owner.send(
      `Hi! I couldn't post the **${feature}** message in **#${channel.name}** on **${guild.name}** ` +
      `because I'm missing these permissions there: **${missing.map(readable).join(", ")}**.\n` +
      `Please give my role these permissions in that channel (Edit channel -> Permissions), ` +
      `or choose a different channel with the setup command.`,
    );
    report("info", `DMed owner ${ownerLabel} for ${where}, missing ${missing.join(", ")}`);
    await record("sent");
    return "sent";
  } catch (err) {
    if (err.code === 50007) {
      report("warn", `owner ${ownerLabel} for ${where} has DMs closed`);
      await record("dm_closed");
      return "dm_closed";
    }
    report("error", `failed to DM owner ${ownerLabel} for ${where}: ${err}`);
    await record("error", String(err));
    return "error";
  }
}
module.exports = { alertMissingPermissions };

