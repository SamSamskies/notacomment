import { nip19 } from "nostr-tools";
import { finalizeEvent, getPublicKey } from "nostr-tools/pure";

if (!process.env.NOSTR_NSEC) {
  console.log("Missing NOSTR_NSEC in .env file");
  process.exit(1);
}

export const strikeApiKey = process.env.STRIKE_API_KEY;
const zapRequestSigningKey = nip19.decode(process.env.NOSTR_NSEC).data;
const lnbitsUrl = process.env.LNBITS_URL;
export const lnbitsAdminKey = process.env.LNBITS_ADMIN_KEY;
export const nwcConnectionString = process.env.NWC_CONNECTION_STRING;
export const LNBITS = "lnbits";
export const STRIKE = "strike";
export const NWC = "nwc";

export const verifyRequiredKeys = () => {
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

export const getPubkey = () => getPublicKey(zapRequestSigningKey);

export const signEvent = (event) => finalizeEvent(event, zapRequestSigningKey);

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
