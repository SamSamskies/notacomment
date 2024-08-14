import axios from "axios";
import { strikeApiKey } from "./keys.js";

const createStrikePaymentQuote = async (invoice) => {
  const { data } = await axios({
    method: "post",
    url: "https://api.strike.me/v1/payment-quotes/lightning",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${strikeApiKey}`,
    },
    data: JSON.stringify({
      lnInvoice: invoice,
      sourceCurrency: "USD",
    }),
  });

  return data.paymentQuoteId;
};

const executeStrikePaymentQuote = async (paymentQuoteId) => {
  const { data } = await axios({
    method: "patch",
    url: `https://api.strike.me/v1/payment-quotes/${paymentQuoteId}/execute`,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${strikeApiKey}`,
    },
  });

  return data;
};

export const payInvoice = async (invoice) => {
  const strikePaymentQuoteId = await createStrikePaymentQuote(invoice);

  return executeStrikePaymentQuote(strikePaymentQuoteId);
};
