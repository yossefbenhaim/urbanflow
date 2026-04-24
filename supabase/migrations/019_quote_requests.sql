-- ══════════════════════════════════════════════════════════
-- Migration 019: Quote requests / responses
-- Fills a schema gap: the quotes tRPC router was already live and the
-- Directory page already rendered "הצעת מחיר" modal, but the backing
-- tables were never created. Clicking "שלח בקשה" failed with
-- "relation public.quote_requests does not exist".
-- Idempotent.
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_description text NOT NULL,
  budget_range text,
  timeline text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','responded','accepted','rejected','cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quote_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  responder_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  price_offer text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_requests_recipient ON public.quote_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_sender ON public.quote_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_quote_responses_request ON public.quote_responses(quote_request_id);

ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see quote requests they're party to" ON public.quote_requests;
CREATE POLICY "Users see quote requests they're party to"
  ON public.quote_requests FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users create quote requests as sender" ON public.quote_requests;
CREATE POLICY "Users create quote requests as sender"
  ON public.quote_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Recipient can update status" ON public.quote_requests;
CREATE POLICY "Recipient can update status"
  ON public.quote_requests FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id OR auth.uid() = sender_id);

DROP POLICY IF EXISTS "Parties can see responses" ON public.quote_responses;
CREATE POLICY "Parties can see responses"
  ON public.quote_responses FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quote_requests qr
    WHERE qr.id = quote_request_id AND (qr.sender_id = auth.uid() OR qr.recipient_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Recipient can respond" ON public.quote_responses;
CREATE POLICY "Recipient can respond"
  ON public.quote_responses FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = responder_id AND EXISTS (
      SELECT 1 FROM public.quote_requests qr
      WHERE qr.id = quote_request_id AND qr.recipient_id = auth.uid()
    )
  );
