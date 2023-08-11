const { nwcConnectionString } = require("./keys");
const { nip04, finishEvent, relayInit } = require("nostr-tools");

globalThis.crypto = require("node:crypto");

const parseConnectionString = (connectionString) => {
  const { pathname, hostname, searchParams } = new URL(connectionString);
  const pubkey = pathname || hostname;
  const relay = searchParams.get("relay");
  const secret = searchParams.get("secret");

  if (!pubkey || !relay || !secret) {
    throw new Error("invalid connection string");
  }

  return { pubkey, relay, secret };
};

const makeNwcRequestEvent = async ({ pubkey, secret, invoice }) => {
  const content = {
    method: "pay_invoice",
    params: {
      invoice,
    },
  };
  const encryptedContent = await nip04.encrypt(
    secret,
    pubkey,
    JSON.stringify(content)
  );
  const eventTemplate = {
    kind: 23194,
    created_at: Math.round(Date.now() / 1000),
    content: encryptedContent,
    tags: [["p", pubkey]],
  };

  return finishEvent(eventTemplate, secret);
};

const openNwcRelayConnection = async () => {
  const { relay: relayUrl } = parseConnectionString(nwcConnectionString);
  const relay = relayInit(relayUrl);

  relay.on("connect", () => {
    console.log(`connected to ${relay.url}`);
  });
  relay.on("error", () => {
    console.log(`failed to connect to ${relay.url}`);
  });

  await relay.connect();

  return relay;
};

const payInvoice = async (invoice) => {
  const { pubkey, secret } = parseConnectionString(nwcConnectionString);
  const event = await makeNwcRequestEvent({ pubkey, secret, invoice });
  const relay = await openNwcRelayConnection();

  return new Promise((resolve, reject) => {
    const sub = relay.sub([
      {
        kinds: [23195],
        "#e": [event.id],
      },
    ]);

    sub.on("event", async (event) => {
      const { result } = JSON.parse(
        await nip04.decrypt(secret, pubkey, event.content)
      );

      if (result) {
        resolve();
      } else {
        reject();
      }

      relay.close();
    });

    relay.publish(event);
  });
};

module.exports = { payInvoice };
