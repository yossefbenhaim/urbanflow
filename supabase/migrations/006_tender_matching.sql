-- Match Proposals
CREATE TABLE IF NOT EXISTS match_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid REFERENCES tenders(id) NOT NULL,
  sender_id uuid REFERENCES auth.users(id) NOT NULL,
  target_id uuid REFERENCES auth.users(id) NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(tender_id, sender_id, target_id)
);

ALTER TABLE match_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own matches" ON match_proposals FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = target_id);
CREATE POLICY "Users can create matches" ON match_proposals FOR INSERT
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Target can update match" ON match_proposals FOR UPDATE
  USING (auth.uid() = target_id);

-- Tender Meetings
CREATE TABLE IF NOT EXISTS tender_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid REFERENCES tenders(id) NOT NULL,
  reporter_id uuid REFERENCES auth.users(id) NOT NULL,
  counterpart_id uuid REFERENCES auth.users(id) NOT NULL,
  scheduled_at timestamptz NOT NULL,
  location text,
  notes text,
  reporter_confirmed boolean DEFAULT false,
  counterpart_confirmed boolean DEFAULT false,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tender_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own meetings" ON tender_meetings FOR SELECT
  USING (auth.uid() = reporter_id OR auth.uid() = counterpart_id);
CREATE POLICY "Users can create meetings" ON tender_meetings FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Participants can update meetings" ON tender_meetings FOR UPDATE
  USING (auth.uid() = reporter_id OR auth.uid() = counterpart_id);

CREATE INDEX idx_match_proposals_tender ON match_proposals(tender_id);
CREATE INDEX idx_tender_meetings_tender ON tender_meetings(tender_id);
