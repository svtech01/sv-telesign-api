import pLimit from "p-limit";

import { parseCSV } from "../utils/csvParser.js";
import { sanitizeRow } from "../utils/csvSanitizer.js";
import { generateTelesignValidatedCSV } from '../utils/csvGenerator.js';

import { telesignService } from "./telesignService.js";
import { dbService } from "./dbService.js";

/**
 * Process a CSV file in controlled concurrent batches.
 *
 * @param {string} filePath - path to uploaded CSV file
 * @param {object} options - configuration for batching
 * @returns {Promise<object>} summary of results
 */
export async function processCSV(filePath, options = {}) {

  const thresholdForBatching = 1000;

  const {
    concurrency = 10,  // how many parallel requests
    delayMs = 200,     // optional delay between batches
    batchSize = 1000,     // how many rows per batch commit
    mode = 'real',
    liveStatus = false,
    append = false
  } = options;

  try {

    console.log("Validation Limit:", batchSize)
    
    const data = await parseCSV(filePath, {
      bucket: process.env.SUPABASE_STORAGE_BUCKET,
      isSupabase: true
    });

    let results = [];
    let invalid = [];

    console.log(`🧩 Parsed ${data.length} rows from CSV`);

    if(data.length < thresholdForBatching && batchSize == "all") {

      console.log(" Processing all data without batching ", batchSize, thresholdForBatching);

      let processor = await processCSVAll(data, {...options, concurrency});

      if(processor){
        results = processor.results
        invalid = processor.invalid
      }

    } else {

      console.log(" Processing data with batching ", batchSize, thresholdForBatching, data.length);

      let processor = await processCSVWithBatching(data, {...options, concurrency, batchSize: thresholdForBatching});

      if(processor){
        results = processor.results
        invalid = processor.invalid
      }
    }

    // Save processed data to database
    const saveResult = await dbService.saveContactsBatch(results)

    // Get total number of contacts with low risk level (high validity)
    const lowRisks = results.filter((contact) => contact.risk_level == "low" && contact.api_valid)

    // Get total number of telesign validated contacts
    const validatedContacts = results.filter((contact) => contact.api_valid)

    // Generate CSV, get download link
    const csvFile = await generateTelesignValidatedCSV(lowRisks)

    return {
      success: true,
      total: data.length,
      processed: results.length,
      validated: validatedContacts.length,
      invalid: invalid.length,
      low_risk: lowRisks.length,
      download: csvFile,
      saved: saveResult
      // results,
      // invalid,
    };

  } catch (err) {
    console.error("❌ Main processing failed:", err);
    return { success: false, error: err.message };
  }

}

export async function processCSVWithBatching(data, options = {}) {

  const { concurrency, delayMs, batchSize, mode, liveStatus, append } = options;

  try {
    
    const limit = pLimit(concurrency);
    const totalBatches = Math.ceil(data.length / batchSize);

    let results = [];
    let invalid = [];

    console.log(" Processing batching for total of : ", data.length)

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      console.log(`🚀 Processing batch ${batchNumber}/${totalBatches} (${batch.length} rows)`);

      await Promise.all(
        batch.map((row) =>
          limit(async () => {
            try {
              const sanitizedRow = sanitizeRow(row);
              const phone = sanitizedRow?.phone;

              if (!phone) {
                invalid.push({ reason: "No valid phone", row });
                return;
              }

              const result = await validatePhoneRow(sanitizedRow, liveStatus);
              results.push(result);
    
            } catch (err) {
              console.warn(`⚠️ Error processing row: ${err.message}`);
              invalid.push({ reason: err.message, row });
            }
          })
        )
      );

      // Optional delay between batches to respect API rate limits
      if (batchNumber < totalBatches && delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return {
      results, invalid
    }
    
  } catch (err) {
    console.error("❌ Batch processing failed:", err);
    return { success: false, error: err.message };
  }
}

export async function processCSVAll(data, options) {
  try {

    const { concurrency, delayMs, batchSize, mode, liveStatus, append } = options;

    const limit = pLimit(10); // limit concurrent requests to 10 

    let results = []; 
    let invalid = []; 

    console.log("🚀 Processing all data for total of : ", data.length)

    await Promise.all( 
      data.map((row) => 
        limit(async () => {
          try {
            const sanitizedRow = sanitizeRow(row);
            const phone = sanitizedRow?.phone;

            if (!phone) {
              invalid.push({ reason: "No valid phone", row });
              return;
            }

            const result = await validatePhoneRow(sanitizedRow, liveStatus);
            results.push(result);
    
          } catch (err) {
            console.warn(`⚠️ Error processing row: ${err.message}`);
            invalid.push({ reason: err.message, row });
          }
        })
      ) 
    ); 
  
    return {
      results,
      invalid
    }
  
  } catch (err) { 
    console.error(err); 
    res.status(500).json({ error: err.message }); 
  }
}

/**
 * Validate a single contact record using Telesign
 * @param {Object} row - Cleaned contact row from CSV
 * @param {boolean} includeLiveStatus - Optional: check live status if true
 * @returns {Promise<Object>} Structured validation result
 */
export async function validatePhoneRow(row, includeLiveStatus = false) {
  let phoneE164 =
    (row.phone || row.e164_format || row.phone_e164 || row.phone_number || "").trim();

  // 🧩 1. Handle missing phone
  if (!phoneE164) {
    return {
      phone_e164: "",
      phone_international: row.international_format || "",
      phone_national: row.national_format || "",
      first_name: row.first_name || "",
      last_name: row.last_name || "",
      email: row.email || "",
      company: row.company || "",
      title: row.title || "",
      api_valid: false,
      api_status: "no_phone",
      carrier: "unknown",
      phone_type: "unknown",
      risk_level: "unknown",
    };
  }

  let api_valid = false;
  let api_status = "error";
  let carrier_info = "unknown";
  let phone_type = "unknown";
  let risk_level = "unknown";
  let is_reachable = null;
  let is_roaming = null;
  let roaming_country = null;

  try {

    // 🧩 2. Perform Telesign phone ID lookup
    const phoneData = await telesignService.phoneIdLookup(phoneE164);

    if (phoneData && !phoneData.error) {
      const statusCode = phoneData.status?.code || 0;
      api_status = phoneData.status?.description || "unknown";

      if (statusCode === 300) {
        api_valid = true;
        carrier_info = phoneData.carrier?.name || "unknown";
        phone_type = phoneData.phone_type?.description || "unknown";

        // Simulate risk assessment helper
        const assessed = telesignService.assessPhoneRisk
          ? telesignService.assessPhoneRisk(phoneData)
          : { risk_level: "unknown", requires_review: false };

        risk_level = assessed.risk_level;
      } else {
        api_valid = false;
      }
    } else {
      api_status = phoneData?.error || "api_error";
    }

    // 🧩 3. Optional live status check
    if (includeLiveStatus && api_valid) {
      try {
        const liveData = await telesignService.phoneIdLiveStatus(phoneE164);

        if (liveData && !liveData.error) {
          const liveStatus = liveData.status || {};
          const liveStatusCode = liveStatus.code;

          // console.log(`Live status for ${phoneE164}:`, liveStatus.code);

          is_reachable = liveStatusCode === 300;

          const roaming = liveData.roaming || {};
          is_roaming = roaming.status === "roaming";
          roaming_country = roaming.country?.name || null;
        } else {
          api_status = liveData?.error || api_status;
        }
      } catch (liveErr) {
        console.warn(`Live status check error for ${phoneE164}:`, liveErr.message);
      }
    }
  } catch (err) {
    console.warn(`Telesign API call failed for ${phoneE164}:`, err.message);
    api_status = "api_connection_error";
  }

  // 🧩 4. Return structured result
  return {
    phone_e164: phoneE164,
    phone_international: row.international_format || "",
    phone_national: row.national_format || "",
    first_name: row.first_name || "",
    last_name: row.last_name || "",
    email: row.email || "",
    company: row.company || "",
    title: row.title || "",
    website: row.website || "", 
    linkedin_url: row.linkedin_url || "",
    api_valid,
    api_status,
    carrier: carrier_info,
    phone_type,
    risk_level,
    is_reachable,
    is_roaming,
    roaming_country,
  };
}