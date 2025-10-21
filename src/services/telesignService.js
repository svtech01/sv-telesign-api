import axios from "axios";
import { telesignConfig } from "../config/telesignConfig.js";

export const telesignService = {
  async phoneIdLookup(phone) {
    const url = `${telesignConfig.baseUrl}/phoneid/standard/${phone}`;
    const res = await axios.get(url, { headers: telesignConfig.authHeader() });
    return res.data;
  },

  async phoneIdLive(phone) {
    const url = `${telesignConfig.baseUrl}/phoneid/live/${phone}`;
    const res = await axios.get(url, { headers: telesignConfig.authHeader() });
    return res.data;
  },

  async sendOtp(phone) {
    const url = `${telesignConfig.baseUrl}/verify/sms`;
    const res = await axios.post(
      url,
      { phone_number: phone, template: "Your code is $$CODE$$" },
      { headers: telesignConfig.authHeader() }
    );
    return res.data;
  },

  async verifyOtp(referenceId, code) {
    const url = `${telesignConfig.baseUrl}/verify/${referenceId}?verify_code=${code}`;
    const res = await axios.get(url, { headers: telesignConfig.authHeader() });
    return res.data;
  },
};
