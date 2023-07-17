const axios = require("axios");
const { lnbitsAdminKey } = require("./keys");

const payInvoice = async (invoice) => {
  const url = `${process.env.LNBITS_URL}/api/v1/payments`;
  const headers = {
    "X-Api-Key": lnbitsAdminKey,
    "Content-Type": "application/json",
  };

  const { data } = await axios.post(
    url,
    {
      out: true,
      bolt11: invoice,
    },
    { headers }
  );

  return data;
};

module.exports = { payInvoice };
