import axios from "axios";
import { telesignConfig } from "../config/telesignConfig.js";

export const telesignService = {
  async phoneIdLookup(phone) {
    const url = `${telesignConfig.baseUrl}/phoneid/standard/${phone}`;
    const res = await axios.get(url, { headers: telesignConfig.authHeader() });
    return res.data;
  },

  async phoneIdLiveStatus(phone) {
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

  /**
   * Simulate risk assessment based on Telesign phone intelligence data.
   * (Offline-compatible)
   * @param {Object} phoneData - Telesign phone intelligence API response
   * @returns {{ risk_level: string, requires_review: boolean }}
   */
  assessPhoneRisk(phoneData = {}) {
    try {
      const statusCode = phoneData?.status?.code || 0;
      const phoneType = (phoneData?.phone_type?.description || "").toLowerCase();
      const carrier = (phoneData?.carrier?.name || "").toLowerCase();

      // Offline mode
      if (carrier === "offline_processing") {
        if (statusCode === 300) {
          return { risk_level: "low", requires_review: false };
        } else {
          return { risk_level: "medium", requires_review: true };
        }
      }

      // Invalid / non-successful status
      if (statusCode !== 300) {
        return { risk_level: "high", requires_review: true };
      }

      // VOIP or fixed lines = medium risk
      if (phoneType.includes("voip") || phoneType.includes("fixed")) {
        return { risk_level: "medium", requires_review: true };
      }

      // Live status risk check
      const liveStatus = phoneData?.live;
      if (liveStatus) {
        const liveCode = liveStatus?.status?.code || 0;
        if (liveCode !== 300) {
          return { risk_level: "high", requires_review: true };
        }
      }

      // Valid mobile = low risk
      if (phoneType.includes("mobile")) {
        return { risk_level: "low", requires_review: false };
      }

      // Default fallback
      return { risk_level: "medium", requires_review: true };
    } catch (error) {
      console.error("Error in simulateRiskAssessment:", error.message);
      return { risk_level: "medium", requires_review: true };
    }
  },
};
