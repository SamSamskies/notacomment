import axios from "axios";
import { lnbitsAdminKey } from "./keys.js";

export const payInvoice = async (invoice) => {
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
