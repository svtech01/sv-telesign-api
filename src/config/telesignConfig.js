import dotenv from "dotenv";
dotenv.config();

export const telesignConfig = {
  baseUrl: "https://rest-api.telesign.com/v1",
  authHeader: () => {
    const creds = `${process.env.TELESIGN_CUSTOMER_ID}:${process.env.TELESIGN_API_KEY}`;
    const encoded = Buffer.from(creds).toString("base64");
    return { Authorization: `Basic ${encoded}` };
  },
};
