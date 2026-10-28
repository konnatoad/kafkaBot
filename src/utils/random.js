/** A whole number from `min` to `max`, both included. */
function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickOne(list) {
  return list[Math.floor(Math.random() * list.length)];
}

module.exports = { randomInt, pickOne };
