const { finishEvent, getPublicKey, nip19 } = require("nostr-tools");

if (!process.env.NOSTR_NSEC) {
  console.log("Missing NOSTR_NSEC in .env file");
  process.exit(1);
}

const strikeApiKey = process.env.STRIKE_API_KEY;
const zapRequestSigningKey = nip19.decode(process.env.NOSTR_NSEC).data;
const lnbitsUrl = process.env.LNBITS_URL;
const lnbitsAdminKey = process.env.LNBITS_ADMIN_KEY;
const nwcConnectionString = process.env.NWC_CONNECTION_STRING;
const LNBITS = "lnbits";
const STRIKE = "strike";
const NWC = "nwc";

const verifyRequiredKeys = () => {
  if (lnbitsUrl && !lnbitsAdminKey) {
    console.log("Missing LNBITS_ADMIN_KEY in .env file");
    process.exit(1);
  }

  if (!lnbitsUrl && lnbitsAdminKey) {
    console.log("Missing LNBITS_URL in .env file");
    process.exit(1);
  }

  if (!nwcConnectionString && !strikeApiKey && !lnbitsUrl && !lnbitsAdminKey) {
    console.log("Missing required .env variables");
    console.log("You must provide one of the following in the .env file:");
    console.log("1. STRIKE_API_KEY");
    console.log("2. NWC_CONNECTION_STRING");
    console.log("3. LNBITS_URL and LNBITS_ADMIN_KEY");
    process.exit(1);
  }

  if (!zapRequestSigningKey) {
    console.log("Missing a valid NOSTR_NSEC in .env file");
    process.exit(1);
  }
};

const getPubkey = () => getPublicKey(zapRequestSigningKey);

const signEvent = (event) => finishEvent(event, zapRequestSigningKey);

const getPaymentService = () => {
  if (lnbitsUrl && lnbitsAdminKey) {
    return LNBITS;
  }

  if (strikeApiKey) {
    return STRIKE;
  }

  if (nwcConnectionString) {
    return NWC;
  }

  return null;
};

module.exports = {
  strikeApiKey,
  lnbitsAdminKey,
  nwcConnectionString,
  verifyRequiredKeys,
  getPubkey,
  signEvent,
  getPaymentService,
  LNBITS,
  STRIKE,
  NWC,
};
