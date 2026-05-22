-- srs_review_log should be an immutable audit trail.
-- Replace the FOR ALL policy with INSERT + SELECT only — users cannot alter their history.

DROP POLICY IF EXISTS "Users manage own review log" ON public.srs_review_log;

CREATE POLICY "Users insert own review log"
  ON public.srs_review_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own review log"
  ON public.srs_review_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins read all review logs"
  ON public.srs_review_log FOR SELECT
  TO authenticated
  USING (public.is_admin());
