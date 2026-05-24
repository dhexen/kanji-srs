-- Votes on vocabulary images (one vote per user per word, upsertable)
CREATE TABLE IF NOT EXISTS vocab_image_votes (
  word      text        NOT NULL,
  user_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote      smallint    NOT NULL CHECK (vote IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (word, user_id)
);

ALTER TABLE vocab_image_votes ENABLE ROW LEVEL SECURITY;

-- Each user can only see and manage their own votes
DROP POLICY IF EXISTS "Users manage their own image votes" ON vocab_image_votes;
CREATE POLICY "Users manage their own image votes" ON vocab_image_votes
  FOR ALL TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Store the Gemini-generated search term so we can retry without calling Gemini again
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS image_search_term text;
