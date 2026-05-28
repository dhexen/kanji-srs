-- ============================================================
-- 1. Vocabulary reports (word error reporting by users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vocab_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word        text NOT NULL,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email  text NOT NULL,
  field       text NOT NULL CHECK (field IN ('reading', 'meaning', 'kanji', 'general')),
  description text,
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vocab_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own vocab reports"
  ON public.vocab_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all vocab reports"
  ON public.vocab_reports FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

CREATE POLICY "Admins update vocab reports"
  ON public.vocab_reports FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

-- ============================================================
-- 2. Add stable UUID to vocabulary table
--    (preparation for future reference-by-id instead of word text)
-- ============================================================
ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
UPDATE public.vocabulary SET id = gen_random_uuid() WHERE id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS vocabulary_id_idx ON public.vocabulary (id);

-- ============================================================
-- 3. FK from user_vocab_progress.jp → vocabulary.word
--    ON UPDATE CASCADE ensures that if a word text is ever corrected,
--    all user progress rows follow automatically.
-- ============================================================
-- Note: vocabulary may have multiple rows per word (one per kanji).
-- The FK is on vocabulary(word) which is NOT unique across rows, so
-- we skip the FK here and rely on the code-level merge instead.
-- Run this only if your vocabulary.word is truly unique per word:
--
-- ALTER TABLE public.user_vocab_progress
--   ADD CONSTRAINT fk_uvp_word
--   FOREIGN KEY (jp) REFERENCES public.vocabulary(word)
--   ON UPDATE CASCADE ON DELETE RESTRICT;
