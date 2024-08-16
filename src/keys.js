import { finalizeEvent, getPublicKey } from "nostr-tools/pure";
import { createBunkerSigner, getSigningKey } from "./nostr.js";

export const strikeApiKey = process.env.STRIKE_API_KEY;
const zapRequestSigningKey = await getSigningKey(process.env.NOSTR_NSEC);
const bunkerUri = process.env.NSEC_BUNKER_URI;
let bunkerSigner = "";
const lnbitsUrl = process.env.LNBITS_URL;
export const lnbitsAdminKey = process.env.LNBITS_ADMIN_KEY;
export const nwcConnectionString = process.env.NWC_CONNECTION_STRING;
export const LNBITS = "lnbits";
export const STRIKE = "strike";
export const NWC = "nwc";

export const verifyRequiredKeys = async () => {
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

  if (!zapRequestSigningKey && !bunkerUri) {
    console.log("Missing a valid NOSTR_NSEC in .env file");
    process.exit(1);
  }

  if (zapRequestSigningKey && !bunkerUri) {
    return;
  }

  bunkerSigner = await createBunkerSigner(bunkerUri, true);

  if (!bunkerSigner) {
    console.log("Missing a valid NSEC_BUNKER_URI in .env file");
    process.exit(1);
  }
};

export const getPubkey = async () =>
  bunkerSigner
    ? await bunkerSigner.getPublicKey()
    : getPublicKey(zapRequestSigningKey);

export const signEvent = async (event) => {
  if (bunkerSigner) {
    const signedEvent = await bunkerSigner.sendRequest("sign_event", [
      JSON.stringify(event),
    ]);

    return JSON.parse(signedEvent);
  }

  return finalizeEvent(event, zapRequestSigningKey);
};

export const getPaymentService = () => {
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
