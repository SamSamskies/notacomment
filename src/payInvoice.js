import { STRIKE, getPaymentService, LNBITS, NWC } from "./keys.js";
import { payInvoice as strikePayInvoice } from "./strike.js";
import { payInvoice as lnbitsPayInvoice } from "./lnbits.js";
import { payInvoice as nwcPayInvoice } from "./nwc.js";

export const payInvoice = {
  [STRIKE]: strikePayInvoice,
  [LNBITS]: lnbitsPayInvoice,
  [NWC]: nwcPayInvoice,
}[getPaymentService()];
