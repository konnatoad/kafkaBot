const BASE_PAYOUT = { easy: 25, medium: 75, hard: 150 };
const MIN_PAYOUT = { easy: 1, medium: 5, hard: 10 };

function currentPrize(difficulty, wrongAttempts) {
  const base = BASE_PAYOUT[difficulty] ?? 75;
  const min = MIN_PAYOUT[difficulty] ?? 1;
  return Math.max(base - wrongAttempts, min);
}

module.exports = { BASE_PAYOUT, MIN_PAYOUT, currentPrize };
