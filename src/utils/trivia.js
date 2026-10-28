const axios = require("axios");

const BASE_PAYOUT = { easy: 25, medium: 75, hard: 150 };
const MIN_PAYOUT = { easy: 1, medium: 5, hard: 10 };

function currentPrize(difficulty, wrongAttempts) {
  const base = BASE_PAYOUT[difficulty] ?? 75;
  const min = MIN_PAYOUT[difficulty] ?? 1;
  return Math.max(base - wrongAttempts, min);
}

/**
 * One multiple-choice question from OpenTDB, with its text decoded. Asked for
 * URL-encoded: its default HTML encoding uses entities like &aring; and &hellip;
 * that a hand-written decoder kept missing.
 */
async function fetchQuestion(difficulty, categoryId) {
  const params = { amount: 1, type: "multiple", encode: "url3986" };
  if (difficulty && difficulty !== "random") params.difficulty = difficulty;
  if (categoryId) params.category = categoryId;

  const { data } = await axios.get("https://opentdb.com/api.php", { params });
  if (data.response_code !== 0 || !data.results?.length) {
    throw new Error(`OpenTDB response_code: ${data.response_code}`);
  }
  const question = data.results[0];
  return {
    question: decodeURIComponent(question.question),
    category: decodeURIComponent(question.category),
    correctAnswer: decodeURIComponent(question.correct_answer),
    incorrectAnswers: question.incorrect_answers.map(decodeURIComponent),
  };
}

/** [{ id, name }] */
async function fetchCategories() {
  const { data } = await axios.get("https://opentdb.com/api_category.php");
  return data.trivia_categories ?? [];
}

module.exports = {
  BASE_PAYOUT,
  MIN_PAYOUT,
  currentPrize,
  fetchQuestion,
  fetchCategories,
};
