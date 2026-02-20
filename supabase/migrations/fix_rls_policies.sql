-- =============================================================
-- SECURITY FIX: Harden RLS Policies for memes table
-- Run this in Supabase Dashboard → SQL Editor
-- =============================================================

-- 1. Remove dangerous public INSERT policy
--    This is the MAIN vulnerability: anyone with anon key can INSERT directly
--    with payment_status='PAID', bypassing API, payment, and NSFW checks.
DROP POLICY IF EXISTS "Public memes can be uploaded by everyone" ON public.memes;

-- 2. Replace public SELECT policy with PAID-only filter
--    Old policy showed ALL memes including PENDING (unpaid).
DROP POLICY IF EXISTS "Public memes are viewable by everyone" ON public.memes;

CREATE POLICY "Only paid memes are publicly viewable"
ON public.memes FOR SELECT
USING (payment_status = 'PAID');

-- 3. Explicitly ensure no public UPDATE/DELETE policies exist
--    Only service_role key (used in API routes) should be able to modify data.
DROP POLICY IF EXISTS "Public memes can be updated by everyone" ON public.memes;
DROP POLICY IF EXISTS "Public memes can be deleted by everyone" ON public.memes;

-- Verify: After running, check Supabase Dashboard → Authentication → Policies
-- You should see ONLY one policy: "Only paid memes are publicly viewable" (SELECT)
-- INSERT / UPDATE / DELETE should have NO public policies.
