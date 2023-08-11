const { STRIKE, getPaymentService, LNBITS, NWC } = require("./keys");

const payInvoice = {
  [STRIKE]: require("./strike").payInvoice,
  [LNBITS]: require("./lnbits").payInvoice,
  [NWC]: require("./nwc").payInvoice,
}[getPaymentService()];

module.exports = { payInvoice };
