import { SimplePool, nip57, nip19 } from "nostr-tools";
import { generateSecretKey } from "nostr-tools/pure";
import { decrypt } from "nostr-tools/nip49";
import { parseBunkerInput, BunkerSigner } from "nostr-tools/nip46";
import axios from "axios";
import { signEvent } from "./keys.js";
import { payInvoice } from "./payInvoice.js";
import { useWebSocketImplementation } from "nostr-tools/pool";
import WebSocket from "ws";
import readlineSync from "readline-sync";

useWebSocketImplementation(WebSocket);

const getUserProfile = async (pubkey) => {
  const pool = new SimplePool();
  const relays = [
    "wss://relay.nostr.band",
    "wss://purplepag.es",
    "wss://relay.damus.io",
    "wss://nostr.wine",
  ];

  try {
    return await pool.get(relays, { kinds: [0], authors: [pubkey] });
  } catch (error) {
    console.error(error);
  } finally {
    if (pool) {
      pool.close(relays);
    }
  }
};

const getUserRelays = async (pubkey) => {
  const pool = new SimplePool();
  const relays = [
    "wss://relay.nostr.band",
    "wss://purplepag.es",
    "wss://relay.damus.io",
    "wss://nostr.wine",
  ];

  try {
    return await pool.get(relays, { kinds: [10002], authors: [pubkey] });
  } catch (error) {
    console.error(error);
  } finally {
    if (pool) {
      pool.close(relays);
    }
  }
};

const fetchInvoice = async ({
  relays,
  zappedPubkey,
  zappedEventId,
  addressPointer,
  amountInSats,
}) => {
  const amountInMillisats = amountInSats * 1000;
  const comment = "Zapped by notacomment ⚡️";
  const userProfile = await getUserProfile(zappedPubkey);

  if (!userProfile) {
    throw new Error(`no user profile found for ${zappedPubkey}`);
  }

  const zapEndpoint = await nip57.getZapEndpoint(userProfile);

  if (!zapEndpoint) {
    throw new Error(`no zap endpoint found for ${zappedPubkey}`);
  }

  const zapRequestEvent = await nip57.makeZapRequest({
    profile: zappedPubkey,
    event: zappedEventId,
    amount: amountInMillisats,
    relays,
    comment,
  });

  if (addressPointer) {
    zapRequestEvent.tags.push(["a", addressPointer]);
  }

  const signedZapRequestEvent = await signEvent(zapRequestEvent);
  const url = `${zapEndpoint}?amount=${amountInMillisats}&nostr=${encodeURIComponent(
    JSON.stringify(signedZapRequestEvent)
  )}&comment=${encodeURIComponent(comment)}`;
  const { data } = await axios(url);
  const invoice = data.pr;

  if (!invoice) {
    throw new Error(`failed to retrieve invoice for ${zappedPubkey}`);
  }

  return invoice;
};

const zapNote = async ({
  zappedPubkey,
  zappedEventId,
  relays,
  amountInSats,
}) => {
  const zappedNpub = nip19.npubEncode(zappedPubkey);
  const zappedNoteId = nip19.noteEncode(zappedEventId);

  console.log(
    `zapping ${zappedNpub} for note ${zappedNoteId} ${amountInSats} sats...`
  );

  try {
    const invoice = await fetchInvoice({
      relays,
      zappedPubkey,
      zappedEventId,
      amountInSats,
    });

    await payInvoice(invoice);
    console.log(
      `successfully zapped ${zappedNpub} for note ${zappedNoteId} ${amountInSats} sats 😎\n`
    );
  } catch (error) {
    console.error(error);
  }
};

const zapLiveChatHost = async ({
  zappedPubkey,
  addressPointer,
  relays,
  amountInSats,
  title,
}) => {
  const zappedNpub = nip19.npubEncode(zappedPubkey);

  console.log(`zapping ${zappedNpub} for ${title} ${amountInSats} sats...`);

  try {
    const invoice = await fetchInvoice({
      relays,
      zappedPubkey,
      addressPointer,
      amountInSats,
    });

    await payInvoice(invoice);
    console.log(
      `successfully zapped ${zappedNpub} for ${title} ${amountInSats} sats 😎\n`
    );
  } catch (error) {
    console.error(error);
  }
};

export const getRelays = async (pubkey) => {
  let relays = [
    "wss://relays.nostr.band",
    "wss://relay.damus.io",
    "wss://nostr.wine",
    "wss://nostr.mutinywallet.com",
    "wss://nostr-pub.wellorder.net",
    "wss://nos.lol",
    "wss://eden.nostr.land",
  ];
  const userRelays = await getUserRelays(pubkey);

  if (userRelays?.tags?.length > 0) {
    relays = userRelays.tags.map((tag) => tag[1]);
  }

  return relays;
};

export const createSubscription = async (pubkey, relays) => {
  const pool = new SimplePool();

  return pool.subscribeMany(
    relays,
    [
      {
        kinds: [1, 1311],
        authors: [pubkey],
        since: Math.round(Date.now() / 1000),
      },
    ],
    {
      onevent(event) {
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
      },
    }
  );
};

export const getAmountInSats = (event) => {
  const regex = /⚡️\s*(\d+)/;
  const matches = event.content.match(regex);

  if (matches && Number.isInteger(Number(matches[1]))) {
    return Number(matches[1]);
  }

  return 0;
};

export const handleNoteEvents = ({ pubkey, event, relays }) => {
  const amountInSats = getAmountInSats(event);

  if (amountInSats <= 0) {
    return;
  }

  const eventTags = event.tags ?? [];
  const zappedPubkey = eventTags
    .slice()
    .reverse()
    .find((tag) => tag[0] === "p")[1];
  const zappedEventId = eventTags
    .slice()
    .reverse()
    .find((tag) => tag[0] === "e")[1];

  if (zappedPubkey && zappedEventId && zappedPubkey !== pubkey) {
    return zapNote({
      zappedPubkey,
      zappedEventId,
      relays,
      amountInSats,
    });
  }
};

export const handleLiveChatEvents = async ({ pubkey, event, relays }) => {
  const amountInSats = getAmountInSats(event);

  if (amountInSats <= 0) {
    return;
  }

  const addressPointer = (event.tags ?? []).find((tag) => tag[0] === "a")[1];
  const [kind, _, d] = addressPointer.split(":");
  const pool = new SimplePool();
  const liveEvent = await pool.get(relays, {
    kinds: [Number(kind)],
    "#d": [d],
  });

  if (!liveEvent) {
    console.log("couldn't find live event details");
    return;
  }

  const hostPubkeyTag = (liveEvent.tags ?? []).find(
    (tag) => tag[0] === "p" && tag[3] === "host"
  );
  const zappedPubkey = hostPubkeyTag ? hostPubkeyTag[1] : liveEvent.pubkey;
  const title = (liveEvent.tags ?? []).find((tag) => tag[0] === "title")[1];

  if (zappedPubkey && addressPointer && zappedPubkey !== pubkey) {
    return zapLiveChatHost({
      zappedPubkey,
      addressPointer,
      relays,
      amountInSats,
      title,
    });
  }
};

let cachedSignedKey = null;

export const getSigningKey = (sec) => {
  return new Promise((resolve) => {
    if (!sec) {
      return resolve(null);
    }

    if (cachedSignedKey) {
      return resolve(cachedSignedKey);
    }

    if (sec.startsWith("nsec")) {
      const signingKey = nip19.decode(process.env.NOSTR_NSEC).data;

      cachedSignedKey = signingKey;
      return resolve(signingKey);
    }

    const password = readlineSync.question("Enter password to decrypt nsec: ", {
      hideEchoBack: true, // This option masks the input
    });

    const signingKey = decrypt(sec, password);

    cachedSignedKey = signingKey;
    resolve(signingKey);
  });
};

export const createBunkerSigner = async (
  bunkerUri,
  willValidateWithBunkerWithPing
) => {
  const bunkerPointer = await parseBunkerInput(bunkerUri);

  if (!bunkerPointer) {
    return null;
  }

  const sk = generateSecretKey();
  const bunkerSigner = new BunkerSigner(sk, bunkerPointer);

  console.log("trying to connect to bunker...");
  await bunkerSigner.connect();

  if (willValidateWithBunkerWithPing) {
    console.log("attempting ping bunker...");
    const pingRes = await bunkerSigner.sendRequest("ping", []);
    console.log(pingRes);

    if (pingRes !== "pong") {
      return null;
    }
  }

  return bunkerSigner;
};
