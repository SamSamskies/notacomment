require("dotenv").config();

const { verifyRequiredKeys, getPubkey } = require("./keys");
const { handleNoteEvents, createSubscription, getRelays } = require("./nostr");

const start = async () => {
  const pubkey = getPubkey();
  const relays = await getRelays(pubkey);
  const sub = await createSubscription(pubkey, relays);

  console.log("listening for notes to zap...\n");

  sub.on("event", (event) => {
    if (event.kind === 1) {
      handleNoteEvents({ pubkey, event, relays });
    }
  });
};

verifyRequiredKeys();
start();
