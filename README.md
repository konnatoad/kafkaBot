# kafkaBot

A multi-purpose Discord bot with YouTube/Twitch notifications, a leveling system, rice grain economy, game stats, moderation tools, and more.

**Links**

- [Invite kafkaBot](https://discord.com/oauth2/authorize?client_id=1238981186035122257)
- [Terms of Service](https://konnatoad.github.io/kafkaBot-Terms-of-Service/)
- [Privacy Policy](https://konnatoad.github.io/kafkaBot-Privacy-Policy/)

---

## Stack

| | |
|---|---|
| Runtime | Node.js v22+ |
| Framework | Discord.js v14 |
| Database | MongoDB (Mongoose) |
| Images | canvacord, sharp, @napi-rs/canvas |
| Process manager | PM2 |

---

## Features

- **Notifications** — YouTube upload alerts and Twitch live alerts per server
- **Leveling** — XP per message, rank cards, server leaderboard
- **Economy** — Rice grain currency with daily rewards, gambling, gacha, and a role store
- **Game stats** — Valorant MMR, TFT rankings, osu! performance points
- **Moderation** — Ban, kick, temp-ban, warn system with history
- **Welcome / Goodbye** — Customizable messages with template placeholders
- **Reaction roles** — Users self-assign roles by reacting to a message
- **Auto-role** — Assign a role automatically on member join
- **Logging** — Message deletion and edit logs
- **Confessions** — Anonymous submissions to a dedicated channel
- **Fun** — Cat/dog pics, random quotes, random videos

---

## Commands

### Public

| Command | Description |
|---|---|
| `/rank` | View your XP rank card |
| `/xp-leaderboard` | Server XP leaderboard |
| `/balance [user]` | Check rice grain balance |
| `/daily` | Collect daily grains (streak bonuses up to 100 days) |
| `/gamble <amount>` | Gamble rice grains |
| `/gacha` | Rice gachapon (5 grain cost, rare golden drops) |
| `/give <user> <amount>` | Transfer grains to another user |
| `/rice-leaderboard` | Server economy leaderboard |
| `/store` | Browse the role store |
| `/stats valorant <player>` | Valorant MMR and rank |
| `/stats tft <player> <region>` | TFT ranked stats and match history |
| `/stats osu <player> <type>` | osu! top plays or recent plays |
| `/confess` | Send an anonymous confession |
| `/randomquote` | Get a random quote |
| `/cat` | Random cat picture |
| `/dog` | Random dog picture |
| `/video` | Random witchii YouTube video |
| `/help` | Paginated command list |
| `/feedback` | Submit bot feedback |
| `/bugreport` | Submit a bug report |

### Admin

**Welcome / Goodbye**

| Command | Description |
|---|---|
| `/welcome-setup <channel>` | Enable welcome messages |
| `/welcome-message [message]` | Set custom welcome message |
| `/welcome-test` | Send a test welcome message |
| `/welcome-disable` | Disable welcome messages |
| `/goodbye-setup <channel>` | Enable goodbye messages |
| `/goodbye-message [message]` | Set custom goodbye message |
| `/goodbye-test` | Send a test goodbye message |
| `/goodbye-disable` | Disable goodbye messages |

Available placeholders: `{USER_MENTION}` `{USER_NAME}` `{SERVER_NAME}` `{SERVER_MEMBER}`

**Notifications**

| Command | Description |
|---|---|
| `/notification-setup <channel> [youtube-id]` | Enable YouTube upload notifications |
| `/notification-remove` | Remove YouTube notification setup |
| `/twitch-config <channel> <username>` | Enable Twitch live notifications |

**Roles & Configuration**

| Command | Description |
|---|---|
| `/autorole-configure <role>` | Auto-assign a role on member join |
| `/autorole-disable` | Disable auto-role |
| `/reactionroles` | Set up reaction roles |
| `/confessionSetup <channel>` | Enable confessions |
| `/confessionDisable` | Disable confessions |
| `/store-config` | Configure roles available in the store |
| `/deletemsglog` | Toggle message deletion logging |
| `/messageupdate` | Toggle message edit logging |

**Moderation**

| Command | Description |
|---|---|
| `/ban <user> [reason]` | Ban a member |
| `/kick <user> [reason]` | Kick a member |
| `/tempban <user> <duration> [reason]` | Temporary ban |
| `/warn <user> [reason]` | Warn a member |
| `/warnings <user>` | View warning history |
| `/clearwarns <user>` | Clear all warnings for a user |
| `/xp-reset` | Reset XP for the entire server |
| `/xpuser-reset <user>` | Reset XP for a specific user |

---

## Self-hosting

### Prerequisites

- Node.js v22+
- MongoDB instance
- A Discord application with a bot token ([Discord Developer Portal](https://discord.com/developers/applications))

### Setup

**1. Clone and install**

```bash
git clone https://github.com/konnatoad/kafkaBot.git
cd kafkaBot
npm install
```

**2. Create your `.env` file**

```env
# Discord
TOKEN=
TESTSERVER=
DEV_ID=
MAIN=
ALT=

# MongoDB
MONGODB_URI=

# Channels
FEEDBACK=
BUG=
ROLE_CHANNEL_ID=

# Twitch
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
TWITCH_ACCESS_TOKEN=

# Game APIs
VALORANT=
RIOT_API=
OSU_CLIENT_ID=
OSU_CLIENT_SECRET=
OSU_REDIRECT_URI=http://localhost
```

**3. Start the bot**

```bash
node src/index.js
```

Or with PM2:

```bash
pm2 start ecosystem.config.js
```

> **Note:** `ecosystem.config.js` has a hardcoded `cwd` path. Update it to match your own project directory before using PM2.

### First-time configuration

After inviting the bot to your server, use these commands to set things up:

- `/welcome-setup` — configure welcome messages
- `/goodbye-setup` — configure goodbye messages
- `/autorole-configure` — set an auto-join role
- `/notification-setup` — link a YouTube channel for upload alerts
- `/twitch-config` — link a Twitch streamer for live alerts
- `/reactionroles` — set up self-assignable roles
- `/store-config` — add roles to the purchasable store

All settings are stored per-server in MongoDB.

---

## Required Discord Intents

- Guilds
- GuildMembers
- GuildMessages
- MessageContent
- GuildMessageReactions
- GuildModeration

---

## License

This project is open source. Feel free to fork and self-host.
