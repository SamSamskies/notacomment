import { getPaymentService } from "./keys.js";
import { payInvoice as strikePayInvoice } from "./strike.js";
import { payInvoice as lnbitsPayInvoice } from "./lnbits.js";
import { payInvoice as nwcPayInvoice } from "./nwc.js";

export const payInvoice = (invoice) => {
  return {
    strike: strikePayInvoice,
    lnbits: lnbitsPayInvoice,
    nwc: nwcPayInvoice,
  }[getPaymentService()](invoice);
};
