const { greet } = require("../../utils/greetings");

// accounts set as MAIN and ALT in .env never get a goodbye message
const SILENT_LEAVERS = [process.env.MAIN, process.env.ALT].filter(Boolean);

module.exports = (member) => {
  if (SILENT_LEAVERS.includes(member.id)) return;
  return greet("goodbye", member);
};
