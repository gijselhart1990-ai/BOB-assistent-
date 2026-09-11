-- Eén Outlook-koppeling per Google-werkcontext; bestaande gegevens blijven behouden.
CREATE TABLE IF NOT EXISTS bob_microsoft_accounts (
  environment text NOT NULL,
  owner_id text NOT NULL,
  google_subject text NOT NULL,
  tenant_id text NOT NULL,
  microsoft_subject text NOT NULL,
  email text NOT NULL,
  token_ciphertext text NOT NULL,
  version uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (environment, owner_id, google_subject),
  FOREIGN KEY (environment, owner_id, google_subject)
    REFERENCES bob_google_accounts (environment, owner_id, google_subject) ON DELETE CASCADE
);
