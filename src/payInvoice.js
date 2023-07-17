const {
  createStrikePaymentQuote,
  executeStrikePaymentQuote,
} = require("./strike");

const payInvoice = async (invoice) => {
  const strikePaymentQuoteId = await createStrikePaymentQuote(invoice);

  return executeStrikePaymentQuote(strikePaymentQuoteId);
};

module.exports = { payInvoice };
