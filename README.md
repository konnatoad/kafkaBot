# kafkaBot

A multi-purpose Discord bot with YouTube/Twitch notifications, a leveling system, a rice grain economy, daily trivia, game stats, auto-moderation, moderation tools, and more.

**Links**

- [Invite kafkaBot](https://discord.com/oauth2/authorize?client_id=1238981186035122257)
- [Terms of Service](https://konnatoad.github.io/kafkaBot-Terms-of-Service/)
- [Privacy Policy](https://konnatoad.github.io/kafkaBot-Privacy-Policy/)

---

## Stack

|                 |                                                                              |
| --------------- | ---------------------------------------------------------------------------- |
| Runtime         | Node.js v22+                                                                 |
| Framework       | Discord.js v14 + [djs-commander](https://github.com/konnatoad/djs-commander) |
| Database        | MongoDB (Mongoose)                                                           |
| Images          | canvacord, sharp, @napi-rs/canvas                                            |
| Logging         | winston (optional Discord webhook transport)                                 |
| Scheduling      | node-cron                                                                    |
| Process manager | PM2                                                                          |

---

## Features

- **Notifications** — YouTube upload alerts and Twitch live alerts per server, with custom messages
- **Leveling** — XP per message, rank cards, server leaderboard
- **Economy** — Rice grain currency with dailies, daily reminders, begging, rep, gambling, gacha, and a role store
- **Daily trivia** — Scheduled trivia question per server with configurable time, timezone, and difficulty
- **Game stats** — Valorant MMR, TFT rankings, osu! top/recent plays
- **Auto-moderation** — Discord AutoMod rules (spam, profanity, slurs, sexual content, mention limit, custom words) with automatic warns
- **Moderation** — Ban, kick, temp-ban, warn system with history
- **Welcome / Goodbye** — Customizable messages (plain or embed) with template placeholders
- **Reaction roles** — Users self-assign roles by reacting to a message
- **Auto-role** — Assign a role automatically on member join
- **Auto-reactor** — Automatically react to every message in chosen channels
- **Quotes** — Save messages as quotes, pull random ones, and post a daily quote
- **Logging** — Message deletion and edit logs
- **Confessions** — Anonymous submissions to a dedicated channel
- **7TV emotes** — Add a 7TV emote to the server from a link

---

## Commands

### Public

**Economy**

| Command                                  | Description                                     |
| ---------------------------------------- | ----------------------------------------------- |
| `/balance [target-user]`                 | Check rice grain balance                        |
| `/daily`                                 | Collect daily grains (streak bonuses)           |
| `/remind set <time>` / `/remind disable` | Daily reminder for your dailies                 |
| `/beg`                                   | Beg for a chance at extra grains                |
| `/rep <user>`                            | Give 25 grains to another user once per day     |
| `/give <user> <amount>`                  | Transfer grains to another user                 |
| `/gamble <amount> [all-in]`              | Gamble rice grains                              |
| `/gacha`                                 | Rice gachapon (5 grain cost, rare golden drops) |
| `/store`                                 | View roles available in the store               |
| `/buy-role <role>`                       | Buy a role from the store                       |
| `/ricetop`                               | Server economy leaderboard                      |

**Leveling**

| Command           | Description           |
| ----------------- | --------------------- |
| `/rank [user]`    | View an XP rank card  |
| `/xp-leaderboard` | Server XP leaderboard |

**Game stats**

| Command                                        | Description                        |
| ---------------------------------------------- | ---------------------------------- |
| `/stats valorant <player> [region] [platform]` | Valorant MMR and rank              |
| `/stats tft <player> [region]`                 | TFT ranked stats and match history |
| `/stats osu <player> <type>`                   | osu! top plays or recent plays     |

**Misc**

| Command               | Description                               |
| --------------------- | ----------------------------------------- |
| `/confess`            | Send an anonymous confession              |
| `/randomquote [user]` | Get a random saved quote                  |
| `/kafka`              | Random Kafka picture (NSFW channels only) |
| `/help`               | Paginated command list                    |
| `/feedback`           | Send feedback to the bot developer        |
| `/bug-report`         | Submit a bug report                       |

### Admin

**Welcome / Goodbye**

| Command                                  | Description                 |
| ---------------------------------------- | --------------------------- |
| `/welcome-setup <channel>`               | Enable welcome messages     |
| `/welcome-message [message] [use_embed]` | Set custom welcome message  |
| `/welcome-test`                          | Send a test welcome message |
| `/welcome-disable`                       | Disable welcome messages    |
| `/goodbye-setup <channel>`               | Enable goodbye messages     |
| `/goodbye-message [message] [use_embed]` | Set custom goodbye message  |
| `/goodbye-test`                          | Send a test goodbye message |
| `/goodbye-disable`                       | Disable goodbye messages    |

Available placeholders: `{USER_MENTION}` `{USER_NAME}` `{SERVER_NAME}` `{SERVER_MEMBER}`

**Notifications**

| Command                                                              | Description                         |
| -------------------------------------------------------------------- | ----------------------------------- |
| `/notification-setup <youtube-id> <target-channel> [custom-message]` | Enable YouTube upload notifications |
| `/notification-remove <youtube-id> <target-channel>`                 | Remove YouTube notifications        |
| `/twitchnotify setup <twitch_url> <channel> [custom-message]`        | Enable Twitch live notifications    |
| `/twitchnotify remove <twitch_url>`                                  | Remove Twitch live notifications    |

**Trivia & Quotes**

| Command                                                  | Description                      |
| -------------------------------------------------------- | -------------------------------- |
| `/trivia-setup <channel> <time> <timezone> [difficulty]` | Schedule a daily trivia question |
| `/trivia-disable`                                        | Disable daily trivia             |
| `/quote add <messageid>`                                 | Save a message as a quote        |
| `/quote remove <quoteid>`                                | Remove a quote                   |
| `/quote list [user]`                                     | List saved quotes                |
| `/dailyquote enable <channel>` / `/dailyquote disable`   | Post a daily quote               |

**Roles & Configuration**

| Command                                            | Description                       |
| -------------------------------------------------- | --------------------------------- |
| `/autorole-configure <role>`                       | Auto-assign a role on member join |
| `/autorole-disable`                                | Disable auto-role                 |
| `/reaction-roles add` / `remove`                   | Manage reaction roles             |
| `/reactor setup` / `disable` / `remove-all`        | Manage auto-reactions per channel |
| `/confession-setup <channel>`                      | Enable confessions                |
| `/confessions-disable`                             | Disable confessions               |
| `/store-setup add <role> <cost>` / `remove <role>` | Configure roles in the store      |
| `/delete-message-log setup` / `disable`            | Message deletion logging          |
| `/message-update-log setup` / `disable`            | Message edit logging              |
| `/add7tv <link> [name]`                            | Add a 7TV emote to the server     |

**Moderation**

| Command                                                                                                   | Description                    |
| --------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `/automod-setup <log-channel> [spam] [profanity] [slurs] [sexual-content] [mention-limit] [custom-words]` | Turn on AutoMod                |
| `/automod-disable`                                                                                        | Turn off AutoMod               |
| `/ban <target-user> [reason]`                                                                             | Ban a member                   |
| `/kick <target-user> [reason]`                                                                            | Kick a member                  |
| `/tempban <user> [weeks] [days] [hours] [minutes] [reason]`                                               | Temporary ban                  |
| `/warn <user> <reason>`                                                                                   | Warn a member                  |
| `/warnings <user>`                                                                                        | View warning history           |
| `/clearwarn <user>`                                                                                       | Clear all warnings for a user  |
| `/xp-reset`                                                                                               | Reset XP for the entire server |
| `/xpuser-reset <user>`                                                                                    | Reset XP for a specific user   |

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
# Required
TOKEN=
MONGODB_URI=
DEV_ID=
TESTSERVER=

# Logging (optional) — ships logs to a Discord webhook, errors ping the user ID
LOG_WEBHOOK_URL=
LOG_PING_USER_ID=

# Feedback / bug report channels (optional)
FEEDBACK=
BUG=

# Bug reports as GitHub issues (optional)
GITHUB_TOKEN=
GITHUB_OWNER=
GITHUB_REPO=

# Notifications (optional)
YOUTUBE_API_KEY=
TWITCH_CLIENT_ID=
TWITCH_ACCESS_TOKEN=

# Game APIs (optional)
VALORANT=
RIOT_API=
OSU_CLIENT_ID=
OSU_CLIENT_SECRET=

# User IDs skipped by goodbye messages (optional)
MAIN=
ALT=
```

The bot exits on startup if any required variable is missing, and logs a warning for unset optional ones.

**3. Create `config.json`** in the project root

```json
{
  "testServer": "",
  "witchServers": [],
  "devs": [],
  "xpIgnoredChannels": []
}
```

**4. Local-only files**

Some files are gitignored and must be provided yourself:

- `src/static/kafka/` — image folder for `/kafka`

**5. Start the bot**

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

Or with PM2:

```bash
pm2 start ecosystem.config.js
```

> **Note:** `ecosystem.config.js` has hardcoded `cwd` and log paths. Update them to match your own project directory before using PM2.

### Scripts

| Script                            | Description      |
| --------------------------------- | ---------------- |
| `npm start`                       | Run the bot      |
| `npm run dev`                     | Run with nodemon |
| `npm run lint` / `lint:fix`       | ESLint           |
| `npm run format` / `format:check` | Prettier         |

### First-time configuration

After inviting the bot to your server, use these commands to set things up:

- `/welcome-setup` / `/goodbye-setup` — welcome and goodbye messages
- `/autorole-configure` — auto-join role
- `/automod-setup` — AutoMod rules
- `/notification-setup` — YouTube upload alerts
- `/twitchnotify setup` — Twitch live alerts
- `/trivia-setup` — daily trivia
- `/reaction-roles add` — self-assignable roles
- `/store-setup add` — purchasable roles

All settings are stored per-server in MongoDB.

---

## Deployment

Pushes to `main` deploy automatically via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on a self-hosted runner: it pulls the latest code, runs `npm ci`, and restarts the `kafka` PM2 process.

---

## Required Discord Intents

- Guilds
- GuildMembers
- GuildMessages
- MessageContent
- GuildMessageReactions
- GuildModeration
- AutoModerationExecution

---

## License

Licensed under the [GNU General Public License v3.0 or later](LICENSE). Feel free to fork and self-host.
