import "dotenv/config";
import { verifyRequiredKeys, getPubkey } from "./keys.js";
import {
  handleNoteEvents,
  handleLiveChatEvents,
  createSubscription,
  getRelays,
} from "./nostr.js";

const start = async () => {
  const pubkey = getPubkey();
  const relays = await getRelays(pubkey);
  const sub = await createSubscription(pubkey, relays);

  console.log("listening for notes to zap...\n");

  sub.on("event", (event) => {
    try {
      if (event.kind === 1) {
        handleNoteEvents({ pubkey, event, relays });
      }

      if (event.kind === 1311) {
        handleLiveChatEvents({ pubkey, event, relays });
      }
    } catch (error) {
      console.error(error);
    }
  });
};

verifyRequiredKeys();
start();
