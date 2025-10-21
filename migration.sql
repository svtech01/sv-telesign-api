CREATE TABLE contacts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  phone_number TEXT NOT NULL,
  phone_number_e164 TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  company TEXT,
  title TEXT,
  industry TEXT,
  linkedin_url TEXT,
  website TEXT,
  
  -- Phone Intelligence Data
  carrier TEXT,
  phone_type TEXT,
  country_code TEXT,
  is_valid BOOLEAN DEFAULT FALSE,
  is_reachable BOOLEAN,
  is_roaming BOOLEAN,
  roaming_country TEXT,
  
  -- Risk Assessment
  risk_level TEXT DEFAULT 'unknown',
  requires_review BOOLEAN DEFAULT FALSE,
  
  -- Status Management
  verification_status TEXT DEFAULT 'pending',
  consent_status TEXT DEFAULT 'unknown',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ,

  -- Indexes for faster queries
  CONSTRAINT contacts_phone_number_unique UNIQUE (phone_number),
  CONSTRAINT contacts_email_unique UNIQUE (email)
);

-- Create separate indexes for performance
CREATE INDEX idx_contacts_phone_number ON contacts(phone_number);
CREATE INDEX idx_contacts_phone_number_e164 ON contacts(phone_number_e164);
CREATE INDEX idx_contacts_created_at ON contacts(created_at);


CREATE TABLE verification_attempts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contact_id BIGINT REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,

  -- OTP Details
  otp_code TEXT,
  otp_expires_at TIMESTAMPTZ,
  verification_method TEXT DEFAULT 'sms',
  
  -- Telesign Response Data
  telesign_reference_id TEXT,
  telesign_status TEXT,
  telesign_sub_resource TEXT,
  
  -- Attempt Status
  status TEXT DEFAULT 'pending',
  attempts_count INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  
  -- Error Handling
  error_code TEXT,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Helpful indexes
CREATE INDEX idx_verification_attempts_contact_id ON verification_attempts(contact_id);
CREATE INDEX idx_verification_attempts_status ON verification_attempts(status);
CREATE INDEX idx_verification_attempts_created_at ON verification_attempts(created_at);


CREATE TABLE phone_lookup_results (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contact_id BIGINT REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  
  -- Telesign Response
  telesign_reference_id TEXT,
  original_number TEXT NOT NULL,
  cleansed_number TEXT,
  country_iso2 TEXT,
  country_iso3 TEXT,
  
  -- Carrier Info
  carrier_name TEXT,
  mobile_country_code TEXT,
  mobile_network_code TEXT,
  
  -- Phone Type and Status
  phone_type_code TEXT,
  phone_type_description TEXT,
  numbering_plan TEXT,
  
  -- Live Status
  live_status_code TEXT,
  live_status_description TEXT,
  is_roaming BOOLEAN,
  roaming_country TEXT,
  
  -- Risk and Quality
  risk_level TEXT,
  risk_recommendation TEXT,
  quality_score FLOAT,
  
  -- Timestamps
  lookup_date TIMESTAMPTZ DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX idx_phone_lookup_results_contact_id ON phone_lookup_results(contact_id);
CREATE INDEX idx_phone_lookup_results_original_number ON phone_lookup_results(original_number);
CREATE INDEX idx_phone_lookup_results_lookup_date ON phone_lookup_results(lookup_date);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_contacts_updated_at
BEFORE UPDATE ON contacts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();