const { SimplePool, nip57, nip19 } = require("nostr-tools");
const axios = require("axios");
const { signEvent } = require("./keys");
const { payInvoice } = require("./payInvoice");

require("websocket-polyfill");
nip57.useFetchImplementation(require("node-fetch"));

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
  const comment = "Zapped by ice cream so good 🍦";
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

const getRelays = async (pubkey) => {
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

const createSubscription = async (pubkey, relays) => {
  const pool = new SimplePool();

  return pool.sub(relays, [
    {
      kinds: [1, 1311],
      authors: [pubkey],
      since: Math.round(Date.now() / 1000),
    },
  ]);
};

const getAmountInSats = (event) => {
  const regex = /(?:\u{1F366}|\u{FE0F}\u{20E3})/gu;
  const matches = event.content.match(regex);

  return matches ? matches.length * 21 : 0;
  // const regex = /⚡️\s*(\d+)/;
  // const matches = event.content.match(regex);
  //
  // if (matches && Number.isInteger(Number(matches[1]))) {
  //   return Number(matches[1]);
  // }
  //
  // return 0;
};

const handleNoteEvents = ({ pubkey, event, relays }) => {
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

const handleLiveChatEvents = async ({ pubkey, event, relays }) => {
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

module.exports = {
  createSubscription,
  handleNoteEvents,
  handleLiveChatEvents,
  getRelays,
  getAmountInSats,
};
