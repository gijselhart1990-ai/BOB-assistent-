CREATE TABLE IF NOT EXISTS bob_chat_turns (
  id uuid PRIMARY KEY,
  environment text NOT NULL,
  owner_id text NOT NULL,
  google_subject text NOT NULL,
  ciphertext text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (environment, owner_id, google_subject)
    REFERENCES bob_google_accounts(environment, owner_id, google_subject) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS bob_chat_turns_history
  ON bob_chat_turns(environment, owner_id, google_subject, created_at DESC, id DESC);
