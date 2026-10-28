const Cooldown = require("../schemas/Cooldown");

// Starts `commandName`'s cooldown for `userId` in one database operation, so two
// clicks at the same moment can't both get through. Returns 0 when it started,
// otherwise how many ms of the running cooldown are left.
async function claimCooldown(userId, commandName, ms) {
  const now = new Date();
  try {
    await Cooldown.findOneAndUpdate(
      { userId, commandName, endsAt: { $lte: now } },
      { $set: { endsAt: new Date(now.getTime() + ms) } },
      { upsert: true },
    );
    return 0;
  } catch (err) {
    // the filter missed because a cooldown is running, and the upsert then hit
    // the unique (userId, commandName) index
    if (err.code !== 11000) throw err;
  }
  const running = await Cooldown.findOne({ userId, commandName });
  return running ? Math.max(0, running.endsAt - now) : 0;
}

async function releaseCooldown(userId, commandName) {
  await Cooldown.deleteOne({ userId, commandName });
}

module.exports = { claimCooldown, releaseCooldown };
