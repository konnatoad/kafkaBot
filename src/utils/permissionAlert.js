const PermissionAlert = require("../schemas/PermissionAlert");
const logger = require("../extra/logger");

const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const readable = (perm) => perm.replace(/([a-z])([A-Z])/g, "$1 $2");

function report(client, level, text, toChannel = true) {
  logger[level](`permission-alert; ${text}`);
  const logChannelId = process.env.PERMISSION_LOG;
  if (!toChannel || !logChannelId) return;
  client.channels.cache
    .get(logChannelId)
    ?.send(`[${level}] ${text}`)
    .catch(() => { });
}

async function alertMissingPermission(guild, channel, missing, feature) {
  const client = guild.client;
  const key = `${feature}:${channel.id}`;
  const where = `guild "${guild.name}" (${guild.id}), ${feature} channel #{channel.name} (${channel.id})`;
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
      client,
      "info",
      `skipped for ${where}, last attempt ${prev?.lastSentAt?.toISOString()} (result: ${prev?.lastResult})`,
      false,
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
    report(client, "warn", `could not fetch owner for ${where}`);
    await record("owner_not_found");
    return "owner_not_found";
  }
  const ownerLabel = `${owner.user.username} (${owner.id})`;
  try {
    await owner.send(
      `Hi! I couldn't post the **${feature}** message in **#${channel.name}** on **${guild.name}**` +
      `Because i'm missing these permissions there: **${missing.map(readable).join(", ")}**.\n` +
      `Please give my role these permissions in that channel (Edit channel -> Permissions),` +
      `or choose a different channel with the setup command.`,
    );
    report(client, "info", `DMed owner ${ownerLabel} for ${where}, missing ${missing.join(", ")}`);
    await record("sent");
    return "sent";
  } catch (err) {
    if (err.code === 50007) {
      report(client, "warn", `owner ${ownerLabel} for ${where} has DMs closed`);
      await record("dm_closed");
      return "dm_closed";
    }
    report(client, "error", `failed to DM owner ${ownerLabel} for ${where}: ${err}`);
    return "error";
  }
}
module.exports = { alertMissingPermission };

