import fs from "fs";
import csv from "csv-parser";
import { parsePhoneNumberFromString } from "libphonenumber-js";

// Define header mapping
const SEAMLESS_MAPPING = {
  first_name: ["First Name", "first_name"],
  last_name: ["Last Name", "last_name"],
  email: ["Email 1", "email", "email_1"],
  company: ["Company Name - Cleaned", "Company Name", "company_name", "company"],
  title: ["Title", "job_title", "title"],
  website: ["Website", "website", "site"],
  linkedin_url: ["Contact LI Profile URL", "LinkedIn Profile URL"],
  phone_number: [
    "Contact Phone 1",
    "Contact Mobile Phone",
    "phone",
    "phone_number",
    "mobile_phone",
    "contact",
    "contact_phone",
    "number",
  ],
};

/**
 * Sanitize CSV file and map consistent fields using SEAMLESS_MAPPING.
 * @param {string} filePath - CSV file path
 * @returns {Promise<Array>} Cleaned contact objects
 */
export async function sanitizeCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        try {
          const cleaned = sanitizeRow(row);
          if (cleaned) results.push(cleaned);
        } catch (err) {
          console.error("Error processing row:", err);
        }
      })
      .on("end", () => resolve(results))
      .on("error", (err) => reject(err));
  });
}

/**
 * Sanitize a single CSV row
 * Maps data using SEAMLESS_MAPPING, validates phone numbers.
 */
export function sanitizeRow(row) {
  if (!row || typeof row !== "object") return null;

  // Lowercase keys for consistent matching
  const lowerKeys = Object.keys(row).reduce((acc, key) => {
    acc[key.toLowerCase()] = row[key];
    return acc;
  }, {});

  // Generic mapper based on SEAMLESS_MAPPING
  const mapped = {};
  for (const [targetKey, possibleFields] of Object.entries(SEAMLESS_MAPPING)) {
    for (const field of possibleFields) {
      const value = lowerKeys[field.toLowerCase()];
      if (value) {
        mapped[targetKey] = value.toString().trim();
        break;
      }
    }
  }

  // Normalize and validate phone number
  const normalizedPhone = normalizePhone(mapped.phone_number);
  if (!normalizedPhone) return null;

  return {
    first_name: mapped.first_name || "",
    last_name: mapped.last_name || "",
    title: mapped.title || "",
    company: mapped.company || "",
    email: mapped.email || "",
    website: mapped.website || "",
    linkedin_url: mapped.linkedin_url || "",
    phone: normalizedPhone,
  };
}

/**
 * Normalize a phone number into E.164 format.
 * Returns null if invalid.
 */
export function normalizePhone(rawPhone, defaultRegion = "US") {
  if (!rawPhone) return null;
  const cleaned = rawPhone.replace(/[^\d+]/g, "");
  const parsed = parsePhoneNumberFromString(cleaned, defaultRegion);
  return parsed && parsed.isValid() ? parsed.number : null;
}
