/** A whole number from `min` to `max`, both included. */
function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickOne(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/** A shuffled copy; every order is equally likely. */
function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

module.exports = { randomInt, pickOne, shuffle };
