const { SimplePool, nip19, nip57 } = require("nostr-tools");
const axios = require("axios");

require("websocket-polyfill");
require("dotenv").config();
nip57.useFetchImplementation(require("node-fetch"));

const { verifyRequiredKeys, signEvent, getPubkey } = require("./keys");
const { payInvoice } = require("./payInvoice");

verifyRequiredKeys();

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
  const signedZapRequestEvent = signEvent(zapRequestEvent);
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

const zap = async ({ zappedPubkey, zappedEventId, relays, amountInSats }) => {
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

const start = async () => {
  let relays = [
    "wss://relays.nostr.band",
    "wss://relay.damus.io",
    "wss://nostr.wine",
    "wss://nostr.mutinywallet.com",
    "wss://nostr-pub.wellorder.net",
    "wss://nos.lol",
    "wss://eden.nostr.land",
  ];
  const pubkey = getPubkey();
  const userRelays = await getUserRelays(pubkey);

  if (userRelays?.tags?.length > 0) {
    relays = userRelays.tags.map((tag) => tag[1]);
  }

  const pool = new SimplePool();
  const sub = pool.sub(relays, [
    {
      kinds: [1],
      authors: [pubkey],
      since: Math.round(Date.now() / 1000),
    },
  ]);

  console.log("listening for notes to zap...\n");

  sub.on("event", (event) => {
    const regex = /⚡️\s*(\d+)/;
    const matches = event.content.match(regex);
    if (matches && Number.isInteger(Number(matches[1]))) {
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
        zap({
          zappedPubkey,
          zappedEventId,
          relays,
          amountInSats: Number(matches[1]),
        });
      }
    }
  });
};

start();
