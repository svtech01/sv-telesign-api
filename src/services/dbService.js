import { supabase } from "../config/supabaseClient.js";

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

    }

};
