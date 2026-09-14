-- Voorbereide migratie; uitvoeren op de afzonderlijke previewdatabase.
-- Tokens worden door de applicatie versleuteld, nooit als platte tekst opgeslagen.
BEGIN;

CREATE TABLE IF NOT EXISTS bob_google_accounts (
  environment text NOT NULL,
  owner_id text NOT NULL,
  google_subject text NOT NULL,
  email text NOT NULL,
  token_ciphertext text NOT NULL,
  refresh_ciphertext text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (environment, owner_id, google_subject)
);

CREATE TABLE IF NOT EXISTS bob_google_selection (
  environment text NOT NULL,
  owner_id text NOT NULL,
  google_subject text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (environment, owner_id),
  FOREIGN KEY (environment, owner_id, google_subject)
    REFERENCES bob_google_accounts (environment, owner_id, google_subject)
    ON DELETE CASCADE
);

COMMIT;
