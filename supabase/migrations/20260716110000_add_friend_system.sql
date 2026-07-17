-- Friend request system
-- Allows users to send, accept, and decline friend requests.
-- Friends are determined by accepted requests (bi-directional).

-- 1. Friend requests table
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- 2. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender   ON public.friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON public.friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status   ON public.friend_requests(status);

-- 3. Enable RLS
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies
-- Authenticated users can read their own requests (as sender or receiver)
CREATE POLICY "Users can read their own friend requests"
  ON public.friend_requests
  FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Authenticated users can send friend requests (as sender)
CREATE POLICY "Users can send friend requests"
  ON public.friend_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Authenticated users can update requests where they are the receiver (accept/decline)
-- or where they are the sender (cancel)
CREATE POLICY "Users can update their own friend requests"
  ON public.friend_requests
  FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid())
  WITH CHECK (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Authenticated users can delete their own requests (cancel/remove friend)
CREATE POLICY "Users can delete their own friend requests"
  ON public.friend_requests
  FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- 5. Allow searching other users' profiles (needed for friend search feature)
-- The existing "own profile read" only allows reading your own profile.
-- This broader policy is required for the username search to work.
CREATE POLICY "profiles search read" ON public.profiles
  FOR SELECT TO authenticated USING (true);
