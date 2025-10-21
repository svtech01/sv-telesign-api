import { supabase } from "../config/db.js";

export const dbService = {

    async saveContact(result, commit = true) {

        try {
            const phone = result.phone_e164;
            if (!phone) {
                throw new Error('Missing phone number (phone_e164) in result.');
            }

            // Check if contact exists
            const { data: existing, error: fetchError } = await supabase
                .from('contacts')
                .select('*')
                .eq('phone_number', phone)
                .maybeSingle();

            if (fetchError) throw fetchError;

            const payload = {
                phone_number: phone,
                phone_number_e164: phone,
                first_name: result.first_name || null,
                last_name: result.last_name || null,
                email: result.email || null,
                company: result.company || null,
                title: result.title || null,
                website: r.website || null,
                linkedin_url: r.linkedin_url || null,
                carrier: result.carrier || null,
                phone_type: result.phone_type || null,
                risk_level: result.risk_level || 'unknown',
                is_valid: !!result.api_valid,
                is_reachable: result.is_reachable ?? null,
                is_roaming: result.is_roaming ?? null,
                roaming_country: result.roaming_country || null,
                verification_status: result.api_valid ? 'verified' : 'failed',
                updated_at: new Date().toISOString(),
            };

            if (existing) {
                // Update existing contact
                const { error: updateError } = await supabase
                    .from('contacts')
                    .update(payload)
                    .eq('id', existing.id);

                if (updateError) throw updateError;
                // logger?.debug?.(`Updated existing contact: ${phone}`);
            } else {
                // Insert new contact
                payload.created_at = new Date().toISOString();

                const { error: insertError } = await supabase
                    .from('contacts')
                    .insert([payload]);

                if (insertError) throw insertError;
                // logger?.debug?.(`Created new contact: ${phone}`);
            }

            // Commit flag placeholder (Supabase auto-commits per query)
            if (!commit) {
                // logger?.debug?.('Batch mode: skipping commit (Supabase auto-commits anyway)');
            }

        } catch (err) {
            console.warn(`Database save error for ${result.phone_e164 || 'unknown'}: ${err.message}`);
        }

    },

    async  saveContactsBatch(results = [], chunkSize = 500) {

        if (!results.length) return { success: false, message: "No results to save." };

        try {
            let totalSaved = 0;

            // Split into smaller chunks
            for (let i = 0; i < results.length; i += chunkSize) {
                const batch = results.slice(i, i + chunkSize);

                const contactsData = batch.map((r) => ({
                    phone_number: r.phone_e164,
                    phone_number_e164: r.phone_e164,
                    first_name: r.first_name || null,
                    last_name: r.last_name || null,
                    email: r.email || null,
                    company: r.company || null,
                    title: r.title || null,
                    website: r.website || null,
                    linkedin_url: r.linkedin_url || null,
                    carrier: r.carrier || null,
                    phone_type: r.phone_type || null,
                    risk_level: r.risk_level || "unknown",
                    is_valid: r.api_valid || false,
                    is_reachable: r.is_reachable ?? null,
                    is_roaming: r.is_roaming ?? null,
                    roaming_country: r.roaming_country || null,
                    verification_status: r.api_valid ? "verified" : "failed",
                    updated_at: new Date().toISOString(),
                }));

                // Batch upsert with conflict handling
                const { error } = await supabase
                    .from("contacts")
                    .upsert(contactsData, { onConflict: "phone_number" });

                if (error) throw error;

                totalSaved += contactsData.length;
                console.log(`✅ Saved batch ${i / chunkSize + 1}: ${contactsData.length} contacts`);
            }

            return { success: true, totalSaved };
        } catch (error) {
            console.error("❌ Error saving contacts:", error.message);
            return { success: false, message: error.message };
        }
    }

};
