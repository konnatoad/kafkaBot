const assert = require("node:assert/strict");
const test = require("node:test");
const { MessageFlags } = require("discord.js");
const { mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const directory = mkdtempSync(join(tmpdir(), "bug-report-words-"));
const wordlist = join(directory, "words.json");
const previousWordlist = process.env.BUG_REPORT_WORDS_FILE;
let handleBugReport;
let hasOffensiveReportText;
try {
  writeFileSync(
    wordlist,
    JSON.stringify({
      words: ["paperclip", "widget*"],
      phrases: ["orange notebook"],
    }),
    { mode: 0o600 },
  );
  process.env.BUG_REPORT_WORDS_FILE = wordlist;
  handleBugReport = require("../src/events/interactionCreate/bugreport");
  ({ hasOffensiveReportText } = require("../src/utils/bugReportWords"));
} finally {
  if (previousWordlist === undefined) delete process.env.BUG_REPORT_WORDS_FILE;
  else process.env.BUG_REPORT_WORDS_FILE = previousWordlist;
  rmSync(directory, { recursive: true, force: true });
}

const fields = ["type", "description", "steps", "expected", "severity"];

function bugReport(values, reply) {
  return {
    customId: "bugreport",
    isModalSubmit: () => true,
    guild: {},
    user: { id: "reporter" },
    fields: { getTextInputValue: (name) => values[name] ?? "Clean test text" },
    reply,
  };
}

test("rejects blocked text privately in every report field before delivery", async () => {
  for (const field of fields) {
    const replies = [];
    await handleBugReport(
      bugReport({ [field]: "PAPERCLIP!" }, (reply) => replies.push(reply)),
      {
        channels: {
          cache: {
            get() {
              assert.fail("a blocked report reached the delivery path");
            },
          },
        },
      },
    );
    assert.deepEqual(replies, [
      {
        content: "please remove offensive language and submit the report again",
        flags: MessageFlags.Ephemeral,
      },
    ]);
  }
});

test("catches normalized spellings and blocked phrases", () => {
  for (const text of [
    "paper\u200bclip",
    "ｐａｐｅｒｃｌｉｐ",
    "p.a.p.e.r.c.l.i.p",
    "orange-notebook",
    "Widgets",
  ]) {
    assert.equal(hasOffensiveReportText(text), true);
  }
});

test("clean technical text reaches the normal delivery path", async () => {
  let lookedUpChannel = false;
  await handleBugReport(
    bugReport(
      {
        type: "/quote list",
        description:
          "The code block traps focus. A raccoon emoji goes missing.",
        steps: "Save a message with a code snippet. Then run /quote list.",
        expected: "The test fixture should render. It fails with 50013!",
      },
      () => {},
    ),
    {
      channels: {
        cache: {
          get() {
            lookedUpChannel = true;
            return null;
          },
        },
      },
    },
  );
  assert.equal(lookedUpChannel, true);
});
