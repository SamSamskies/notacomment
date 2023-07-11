const { finishEvent, getPublicKey, nip19 } = require("nostr-tools");

const strikeApiKey = process.env.STRIKE_API_KEY;
const zapRequestSigningKey = nip19.decode(process.env.NOSTR_NSEC).data;

const verifyRequiredKeys = () => {
  if (!strikeApiKey) {
    console.log("Please set STRIKE_API_KEY in .env file");
    process.exit(1);
  }

  if (!zapRequestSigningKey) {
    console.log("Please set a valid NOSTR_NSEC in .env file");
    process.exit(1);
  }
};

const getPubkey = () => getPublicKey(zapRequestSigningKey);

const signEvent = (event) => finishEvent(event, zapRequestSigningKey);

module.exports = { strikeApiKey, verifyRequiredKeys, getPubkey, signEvent };
