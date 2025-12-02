// Example: add new checkpoint groups here (country, state, email, etc.)
export const CHECKPOINTS = {
  country: {
    mapping: {
      contact_country: [
        "Contact Country",
        "contact country"
      ],
      contact_country_abr: [
        "Contact Country (Alpha 2)",
        "Contact Country (Alpha 3)"
      ],
      contact_country_numeric: [
        "Contact Country - Numeric"
      ]
    },

    allowed: {
      alpha2: ["US", "CA"],
      alpha3: ["USA", "CAN"],
      numeric: ["840", "124"],
      name: ["UNITED STATES", "AMERICA", "CANADA", "United States", "America", "Canada"]
    },

    validator: (data, allowed) => {
      const { contact_country, contact_country_abr, contact_country_numeric } = data;

      const val =
        contact_country?.toUpperCase() ??
        contact_country_abr?.toUpperCase() ??
        contact_country_numeric ??
        null;

      if (!val) return false;

      if (allowed.alpha2.includes(val)) return true;
      if (allowed.alpha3.includes(val)) return true;
      if (allowed.numeric.includes(val)) return true;
      if (allowed.name.includes(val)) return true;

      return false;
    }
  },

  // 🔥 Example future checkpoint
  // state: { mapping: {...}, validator: (data) => {...} }
  // emailDomain: { mapping: {...}, validator: (data) => {...} }
};
