const assert = require("node:assert/strict");
const { test } = require("node:test");
const axios = require("axios");
const handleBugReport = require("../src/events/interactionCreate/bugreport");

const bot = { id: "bot" };
const owner = "987";
const reporter = "123";
const channelId = "bug-channel";
const issueUrl = "https://github.com/example/repo/issues/42";

Object.assign(process.env, {
  DEV_ID: owner,
  BUG: channelId,
  GITHUB_OWNER: "example",
  GITHUB_REPO: "repo",
  GITHUB_TOKEN: "fake",
});

function responseMethods(replies) {
  return {
    async deferReply() {
      this.deferred = true;
    },
    async reply({ content }) {
      replies.push(content);
    },
    async editReply(content) {
      replies.push(content);
    },
  };
}

async function submitReport() {
  const replies = [];
  const message = {
    id: "report-message",
    author: bot,
    async fetch(force) {
      assert.equal(force, true);
      return this;
    },
    async edit({ embeds, components }) {
      this.embeds = embeds.map((embed) => embed.toJSON?.() ?? embed);
      if (components) {
        this.components = components.map((row) => row.toJSON?.() ?? row);
      }
      return this;
    },
  };
  const client = {
    user: bot,
    channels: {
      cache: new Map([
        [channelId, { send: (payload) => message.edit(payload) }],
      ]),
    },
  };
  const values = {
    type: "Quote list",
    description: "The saved quotes disappear.\n> This line is quoted.",
    steps: "Save a quote and run the list command.",
    expected: "The quote should appear.",
    severity: "Low",
  };
  await handleBugReport(
    {
      ...responseMethods(replies),
      customId: "bugreport",
      isModalSubmit: () => true,
      user: { id: reporter, username: "reporter-private" },
      guild: { id: "server-id", name: "server-private" },
      fields: { getTextInputValue: (id) => values[id] },
    },
    client,
  );

  const decide = (decision, userId = owner) =>
    handleBugReport(
      {
        ...responseMethods(replies),
        customId: `bug${decision} - ${reporter}`,
        isButton: () => true,
        user: { id: userId },
        channelId,
        message,
      },
      client,
    );
  return { message, replies, decide };
}

test("submission and decline only write to Discord", async (t) => {
  const post = t.mock.method(axios, "post", () => assert.fail("called GitHub"));
  const { message, replies, decide } = await submitReport();
  assert.equal(message.embeds[0].title, "Bug report pending review");
  assert.deepEqual(
    message.components[0].components.map(({ label }) => label),
    ["Approve", "Decline"],
  );
  assert.match(replies[0], /sent to the developer for review/);

  await decide("Approve", reporter);
  await decide("Decline", reporter);
  assert.equal(message.embeds[0].title, "Bug report pending review");
  assert.equal(replies.filter((reply) => reply.startsWith("Only")).length, 2);

  await decide("Decline");
  await decide("Approve");
  assert.equal(message.embeds[0].title, "Bug report declined");
  assert.deepEqual(
    message.components[0].components.map(({ custom_id }) => custom_id),
    [`bugSolved - ${reporter}`],
  );
  assert.equal(post.mock.callCount(), 0);
});

test("owner approval publishes once and links the issue in Discord", async (t) => {
  const { message, decide } = await submitReport();
  const post = t.mock.method(axios, "post", async (url, payload) => {
    assert.equal(url, "https://api.github.com/repos/example/repo/issues");
    assert.equal(message.embeds[0].title, "Publishing bug report");
    assert.equal(payload.title, "[Bug] Quote list");
    assert.match(payload.body, /disappear\.\n> This line is quoted\./);
    assert.match(payload.body, /Severity\nlow/);
    assert.doesNotMatch(
      JSON.stringify(payload),
      /reporter-private|server-private/,
    );
    return { data: { number: 42, html_url: issueUrl } };
  });

  await Promise.all([decide("Approve"), decide("Approve"), decide("Decline")]);
  await decide("Approve");
  assert.equal(post.mock.callCount(), 1);
  assert.equal(message.embeds[0].title, "Bug report approved (#42)");
  assert.deepEqual(
    message.components[0].components.map(
      ({ custom_id, url }) => custom_id ?? url,
    ),
    [`bugSolved - ${reporter}`, issueUrl],
  );
});

test("explicit rejection restores pending buttons and allows a retry", async (t) => {
  const { message, decide, replies } = await submitReport();
  const post = t.mock.method(axios, "post", async () => {
    if (post.mock.callCount() === 0) {
      throw Object.assign(new Error("GitHub rejected the request"), {
        response: { status: 422 },
      });
    }
    return { data: { number: 42, html_url: issueUrl } };
  });

  await decide("Approve");
  assert.equal(message.embeds[0].title, "Bug report pending review");
  assert.equal(message.components[0].components.length, 2);
  assert.match(replies.at(-1), /you can retry/);

  await decide("Approve");
  assert.equal(post.mock.callCount(), 2);
  assert.equal(message.embeds[0].title, "Bug report approved (#42)");
});

test("unconfirmed publication requires a manual check", async (t) => {
  const post = t.mock.method(axios, "post", async () => {
    throw Object.assign(new Error("Timed out"), { code: "ECONNABORTED" });
  });
  const { message, decide, replies } = await submitReport();
  await decide("Approve");
  assert.match(replies.at(-1), /Couldn't confirm/);
  await decide("Approve");
  assert.equal(post.mock.callCount(), 1);
  assert.equal(message.embeds[0].title, "GitHub outcome needs checking");
  assert.deepEqual(message.components, []);
});
