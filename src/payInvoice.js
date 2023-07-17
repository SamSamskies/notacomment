const { STRIKE, getPaymentService, LNBITS } = require("./keys");

const payInvoice = {
  [STRIKE]: require("./strike").payInvoice,
  [LNBITS]: require("./lnbits").payInvoice,
}[getPaymentService()];

module.exports = { payInvoice };
