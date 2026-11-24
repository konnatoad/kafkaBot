# kafkaBot

discord bot. youtube and twitch alerts, xp and leveling, rice grain economy, daily trivia, game stats, automod and mod tools.

[invite](https://discord.com/oauth2/authorize?client_id=1238981186035122257) · [terms](https://konnatoad.github.io/kafkaBot-Terms-of-Service/) · [privacy](https://konnatoad.github.io/kafkaBot-Privacy-Policy/)

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

Placeholders: `{USER_MENTION}` `{USER_NAME}` `{SERVER_NAME}` `{SERVER_MEMBER}`

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
| `/confessions log [channel]`                         | Log who sent each confession for mods     |
| `/confessions words add <word>` / `remove <word>`    | Block or unblock a word in confessions    |
| `/confessions words list`                            | Show the blocked words                    |
| `/store-setup add <role> <cost>` / `remove <role>`   | Configure roles in the store              |
| `/message-log deleted setup <channel>` / `disable`   | Message deletion logging                  |
| `/message-log edited setup <channel>` / `disable`    | Message edit logging                      |
| `/add7tv <link> [name]`                              | Add a 7TV emote to the server             |

**Moderation**

| Command                                                                                                               | Description                                 |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `/automod setup <log-channel> [spam] [profanity] [slurs] [sexual-content] [mention-limit] [custom-words] [auto-warn]` | Turn on AutoMod                             |
| `/automod disable`                                                                                                    | Turn off AutoMod                            |
| `/ban <target-user> [reason] [weeks] [days] [hours] [minutes]`                                                        | Ban a member, permanently or for a set time |
| `/kick <target-user> [reason]`                                                                                        | Kick a member                               |
| `/warn add <user> [reason]`                                                                                           | Warn a member                               |
| `/warn list <user>`                                                                                                   | View warning history                        |
| `/warn clear <user>`                                                                                                  | Clear all warnings for a user               |
| `/xp-reset server`                                                                                                    | Reset XP for the entire server              |
| `/xp-reset user <user>`                                                                                               | Reset XP for a specific user                |

---

## Self-hosting

you need node 22+, a mongo instance and a bot token from the [developer portal](https://discord.com/developers/applications).

```bash
git clone https://github.com/konnatoad/kafkaBot.git
cd kafkaBot
npm install
```

make a `.env`. the bot won't start without the first four. the rest are optional, missing ones just log a warning.

```env
TOKEN=
MONGODB_URI=
DEV_ID=
TESTSERVER=

LOG_WEBHOOK_URL=       # logs to a discord webhook, errors ping LOG_PING_USER_ID
LOG_PING_USER_ID=
FEEDBACK=              # feedback channel
BUG=                   # bug report channel
GITHUB_TOKEN=          # bug reports as github issues
GITHUB_OWNER=
GITHUB_REPO=
YOUTUBE_API_KEY=
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
VALORANT=
RIOT_API=
OSU_CLIENT_ID=
OSU_CLIENT_SECRET=
MAIN=                  # user IDs goodbye messages skip
ALT=
```

`config.json` in the project root:

```json
{
  "testServer": "",
  "witchServers": [],
  "devs": [],
  "xpIgnoredChannels": []
}
```

`src/static/kafka/` is gitignored, so put your `/kafka` images there yourself.

```bash
npm start      # or npm run dev for nodemon
pm2 start ecosystem.config.js
```

the pm2 config has hardcoded paths, change `cwd` and the log paths first.

Scripts: `npm run lint` / `lint:fix`, `npm run format` / `format:check`.

after you invite the bot, the setup commands are `/welcome setup`, `/goodbye setup`, `/autorole setup`, `/automod setup`, `/notify youtube add`, `/notify twitch add`, `/trivia setup`, `/confessions setup`, `/message-log deleted setup`, `/message-log edited setup`, `/reaction-roles add`, `/store-setup add`. settings are saved per server in mongo.

---

## Deployment

pushes to `main` deploy through [`deploy.yml`](.github/workflows/deploy.yml) on a self-hosted runner. it pulls, runs `npm ci` and restarts the `kafka` pm2 process.

---

## Intents

GuildMembers, GuildMessages, GuildMessageReactions, GuildModeration, MessageContent, AutoModerationExecution, Guilds

---

## License

[GPL-3.0-or-later](LICENSE). fork it, self-host it.
