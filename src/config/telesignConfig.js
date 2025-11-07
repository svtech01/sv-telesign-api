import dotenv from "dotenv";
dotenv.config();

const baseUrl = process.env.TELESIGN_API_URL;

export const telesignConfig = {
  baseUrl: baseUrl,
  authHeader: () => {
    const creds = `${process.env.TELESIGN_CUSTOMER_ID}:${process.env.TELESIGN_API_KEY}`;
    const encoded = Buffer.from(creds).toString("base64");
    return { Authorization: `Basic ${encoded}` };
  },
};
