import pLimit from "p-limit";
import { parseCSV } from "./csvParser.js";
import { sanitizeRow } from "./csvSanitizer.js";
import telesignService from "./telesignService.js";

/**
 * Process a CSV file in controlled concurrent batches.
 *
 * @param {string} filePath - path to uploaded CSV file
 * @param {object} options - configuration for batching
 * @returns {Promise<object>} summary of results
 */
export async function processCSVWithBatching(filePath, options = {}) {
  const {
    concurrency = 10,  // how many parallel requests
    delayMs = 200,     // optional delay between batches
    batchSize = 50     // how many rows per batch commit
  } = options;

  try {
    const data = await parseCSV(filePath);
    const limit = pLimit(concurrency);
    const results = [];
    const invalids = [];

    console.log(`🧩 Parsed ${data.length} rows from CSV`);
    const totalBatches = Math.ceil(data.length / batchSize);

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
                invalids.push({ reason: "No valid phone", row });
                return;
              }

              const lookup = await telesignService.phoneIdLookup(phone);
              results.push({ ...sanitizedRow, lookup });
            } catch (err) {
              console.warn(`⚠️ Error processing row: ${err.message}`);
              invalids.push({ reason: err.message, row });
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
      success: true,
      totalProcessed: results.length + invalids.length,
      validCount: results.length,
      invalidCount: invalids.length,
      results,
      invalids,
    };
  } catch (err) {
    console.error("❌ Batch processing failed:", err);
    return { success: false, error: err.message };
  }
}
