import "dotenv/config";
import { verifyRequiredKeys, getPubkey } from "./keys.js";
import { createSubscription, getRelays } from "./nostr.js";

const start = async () => {
  const pubkey = getPubkey();
  const relays = await getRelays(pubkey);

  await createSubscription(pubkey, relays);
  console.log("listening for notes to zap...\n");
};

verifyRequiredKeys();
start();
