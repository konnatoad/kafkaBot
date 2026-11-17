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
- **Moderation** — Ban (for good or for a set time), kick, warn system with history
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
| `/gamble [amount] [all-in]`              | Gamble rice grains                              |
| `/gacha`                                 | Rice gachapon (5 grain cost, rare golden drops) |
| `/store`                                 | View roles available in the store               |
| `/buy-role <role>`                       | Buy a role from the store                       |
| `/ricetop`                               | Server economy leaderboard                      |

**Leveling**

| Command              | Description           |
| -------------------- | --------------------- |
| `/level rank [user]` | View an XP rank card  |
| `/level leaderboard` | Server XP leaderboard |

**Game stats**

| Command                                                  | Description                        |
| -------------------------------------------------------- | ---------------------------------- |
| `/stats valorant <player> [region] [platform]`           | Valorant MMR and rank              |
| `/stats tft <player> <region>`                           | TFT ranked stats and match history |
| `/stats osu <player> <type>`                             | osu! top plays or recent plays     |
| `/map <map> [acc] [combo] [misses] [n100] [n50] [lazer]` | osu! beatmap info and potential PP |

**Misc**

| Command                | Description                                   |
| ---------------------- | --------------------------------------------- |
| `/confess`             | Send an anonymous confession                  |
| `/randomquote [user]`  | Get a random saved quote                      |
| `/kafka`               | Random Kafka picture (NSFW channels only)     |
| `/help`                | Paginated command list, with every subcommand |
| `/changelog [version]` | What changed in each version of kafkaBot      |
| `/feedback bug`        | Submit a bug report                           |
| `/feedback idea`       | Send feedback to the bot developer            |

### Admin

**Welcome / Goodbye**

| Command                                  | Description                  |
| ---------------------------------------- | ---------------------------- |
| `/welcome setup <channel>`               | Enable welcome messages      |
| `/welcome message <message> [use_embed]` | Set a custom welcome message |
| `/welcome test`                          | Send a test welcome message  |
| `/welcome disable`                       | Disable welcome messages     |
| `/goodbye setup <channel>`               | Enable goodbye messages      |
| `/goodbye message <message> [use_embed]` | Set a custom goodbye message |
| `/goodbye test`                          | Send a test goodbye message  |
| `/goodbye disable`                       | Disable goodbye messages     |

Available placeholders: `{USER_MENTION}` `{USER_NAME}` `{SERVER_NAME}` `{SERVER_MEMBER}`

**Notifications**

| Command                                                              | Description                         |
| -------------------------------------------------------------------- | ----------------------------------- |
| `/notify youtube add <youtube-id> <target-channel> [custom-message]` | Enable YouTube upload notifications |
| `/notify youtube remove <youtube-id> <target-channel>`               | Remove YouTube notifications        |
| `/notify twitch add <twitch_url> <channel> [custom-message]`         | Enable Twitch live notifications    |
| `/notify twitch remove <twitch_url>`                                 | Remove Twitch live notifications    |

**Trivia & Quotes**

| Command                                                  | Description                       |
| -------------------------------------------------------- | --------------------------------- |
| `/trivia setup <channel> <time> <timezone> [difficulty]` | Schedule a daily trivia question  |
| `/trivia disable`                                        | Disable daily trivia              |
| `/quote add <messageid>`                                 | Save a message as a quote         |
| `/quote remove <quoteid>`                                | Remove a quote                    |
| `/quote list [user]`                                     | List saved quotes                 |
| `/quote removeall`                                       | Remove all quotes from the server |
| `/dailyquote enable <channel>` / `/dailyquote disable`   | Post a daily quote                |

**Roles & Configuration**

| Command                                              | Description                               |
| ---------------------------------------------------- | ----------------------------------------- |
| `/autorole setup <role>`                             | Auto-assign a role on member join         |
| `/autorole disable`                                  | Disable auto-role                         |
| `/reaction-roles add <message-id> <emoji> <role>`    | Add a reaction role to a message          |
| `/reaction-roles remove <message-id> <emoji>`        | Remove a reaction role from a message     |
| `/reactor setup <emojis> [channel]`                  | Auto-react to every message in a channel  |
| `/reactor disable <channel>` / `/reactor remove-all` | Stop auto-reactions in one channel or all |
| `/confessions setup <channel>`                       | Enable confessions                        |
| `/confessions disable`                               | Disable confessions                       |
| `/store-setup add <role> <cost>` / `remove <role>`   | Configure roles in the store              |
| `/message-log deleted setup <channel>` / `disable`   | Message deletion logging                  |
| `/message-log edited setup <channel>` / `disable`    | Message edit logging                      |
| `/add7tv <link> [name]`                              | Add a 7TV emote to the server             |

**Moderation**

| Command                                                                                                               | Description                              |
| --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `/automod setup <log-channel> [spam] [profanity] [slurs] [sexual-content] [mention-limit] [custom-words] [auto-warn]` | Turn on AutoMod                          |
| `/automod disable`                                                                                                    | Turn off AutoMod                         |
| `/ban <target-user> [reason] [weeks] [days] [hours] [minutes]`                                                        | Ban a member, for good or for a set time |
| `/kick <target-user> [reason]`                                                                                        | Kick a member                            |
| `/warn add <user> [reason]`                                                                                           | Warn a member                            |
| `/warn list <user>`                                                                                                   | View warning history                     |
| `/warn clear <user>`                                                                                                  | Clear all warnings for a user            |
| `/xp-reset server`                                                                                                    | Reset XP for the entire server           |
| `/xp-reset user <user>`                                                                                               | Reset XP for a specific user             |

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
TWITCH_CLIENT_SECRET=

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

- `/welcome setup` / `/goodbye setup` — welcome and goodbye messages
- `/autorole setup` — auto-join role
- `/automod setup` — AutoMod rules
- `/notify youtube add` — YouTube upload alerts
- `/notify twitch add` — Twitch live alerts
- `/trivia setup` — daily trivia
- `/confessions setup` — anonymous confessions
- `/message-log deleted setup` / `/message-log edited setup` — message logs
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
