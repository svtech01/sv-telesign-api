import Papa from "papaparse";
import { supabase } from "../config/db.js";

/**
 * Parses a CSV file from Supabase or a direct signed URL.
 */
export async function parseCSV(filePath, options = {}) {
  const { bucket = "uploads", isSupabase = true } = options;

  try {
    let csvUrl = filePath;

    // If path (not full URL), get signed URL first
    if (isSupabase && !filePath.startsWith("http")) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 300);
      if (error) throw error;
      csvUrl = data.signedUrl;
    }

    // Download CSV as text
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error("Failed to fetch CSV file");

    const csvText = await response.text();

    // Parse CSV
    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    if (parsed.errors.length > 0) {
      console.warn("CSV parse errors:", parsed.errors);
    }

    return parsed.data;
  } catch (err) {
    console.error("parseCSV error:", err);
    throw err;
  }
}
