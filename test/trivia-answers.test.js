// Which trivia answers get paid. Run with `npm test`.
const test = require("node:test");
const assert = require("node:assert");
const { isCorrect } = require("../src/events/interactionCreate/trivia-modal");

test("accepts the answer with small slips", () => {
  for (const [given, answer] of [
    ["paris", "Paris"],
    ["  Paris ", "Paris"],
    ["Leonardo da Vinci", "Leonardo da Vinci"],
    ["leonardo da vinchi", "Leonardo da Vinci"],
    ["Beatles", "The Beatles"],
    ["1,000", "1000"],
    ["Pokemon", "Pokémon"],
    ["Mississipi", "Mississippi"],
  ])
    assert.ok(isCorrect(given, answer), `${given} should match ${answer}`);
});

test("turns down wrong answers", () => {
  for (const [given, answer] of [
    ["100", "1000"],
    ["London", "Paris"],
    ["Ag", "Au"],
    ["Leonardo", "Leonardo da Vinci"],
    ["Mars", "Mercury"],
    ["", "Paris"],
  ])
    assert.ok(!isCorrect(given, answer), `${given} shouldn't match ${answer}`);
});
