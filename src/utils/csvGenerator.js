import { Parser } from 'json2csv';
import fs from 'fs';
import path from 'path';

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

    if(process.env.ENVIRONMENT == "local") {
      // Ensure downloads folder exists
      const downloadsDir = path.join(process.cwd(), 'downloads');
      if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir);
      }

      // Create a timestamped filename
      const filename = `validated_contacts_${Date.now()}.csv`;
      const filePath = path.join(downloadsDir, filename);

      // // Write file to disk
      fs.writeFileSync(filePath, csv, 'utf8');
      return `/downloads/${filename}`;
    
    } else if(process.env.ENVIRONMENT == "staging") {

      // Use Vercel’s writable tmp directory
      const tmpDir = "/tmp";

      // Ensure the /tmp directory exists (safe even if already present)
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      // Create a timestamped filename
      const filename = `validated_contacts_${Date.now()}.csv`;
      const filePath = path.join(tmpDir, filename);

      fs.writeFileSync(filePath, csv, "utf8");

      // Return the relative file path for download
      return `/downloads/${filename}`;

    }
    
  } catch (error) {
    console.error("Error writing CSV file:", err);
    throw err;
  }

}
