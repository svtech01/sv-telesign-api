import { Parser } from 'json2csv';
import fs from 'fs';
import path from 'path';
import { supabase } from '../config/db.js';

export async function generateTelesignValidatedCSV(validatedResults) {

  if (!validatedResults || validatedResults.length === 0) {
    throw new Error('No validated results found');
  }

  try {

    const fields = [
      { label: 'First Name', value: 'first_name' },
      { label: 'Last Name', value: 'last_name' },
      { label: 'Title', value: 'title' },
      { label: 'Company Name', value: 'company' },
      { label: 'Website', value: 'website' },
      { label: 'LinkedIn Profile URL', value: 'linkedin_url' },
      { label: 'Email', value: 'email' },
      { label: 'Contact Mobile Phone', value: 'phone_e164' }
    ]

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(validatedResults);

    // 2️⃣ Save temporarily to /tmp
    const tmpDir = "/tmp";
    const filename = `validated_contacts_${Date.now()}.csv`;
    const filePath = path.join(tmpDir, filename);
    fs.writeFileSync(filePath, csv, "utf8");

    // 3️⃣ Upload to Supabase Storage
    const fileBuffer = fs.readFileSync(filePath);
    const { data, error } = await supabase.storage
      .from("exports")
      .upload(filename, fileBuffer, {
        contentType: "text/csv",
        upsert: true,
      });

    if (error) throw error;

    // 4️⃣ Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("exports")
      .getPublicUrl(filename);

    return publicUrlData.publicUrl
    
  } catch (error) {
    console.error("Error writing CSV file:", err);
    throw err;
  }

}
