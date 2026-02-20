-- =============================================================
-- FULL MIGRATION SCRIPT — PapanMeme (mimboard)
-- Run this in your NEW Supabase project → SQL Editor
-- This creates everything from scratch with secure RLS policies
-- =============================================================

-- ======================
-- 1. CREATE TABLE
-- ======================
CREATE TABLE public.memes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Image & Display
    image_url TEXT NOT NULL,
    x INTEGER NOT NULL CHECK (x >= 0 AND x <= 1000),
    y INTEGER NOT NULL CHECK (y >= 0 AND y <= 1000),
    width INTEGER NOT NULL CHECK (width > 0),
    height INTEGER NOT NULL CHECK (height > 0),

    -- Metadata
    title TEXT,
    link TEXT,
    user_name TEXT DEFAULT 'Anonymous',
    message VARCHAR(32) DEFAULT NULL,

    -- Payment
    order_id TEXT UNIQUE,
    price INTEGER DEFAULT 0,
    payment_status TEXT DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'EXPIRED')),

    -- Board bounds constraint
    CONSTRAINT memes_bounds CHECK (x + width <= 1000 AND y + height <= 1000)
);

-- Comments
COMMENT ON TABLE public.memes IS 'Stores all meme placements on the PapanMeme board';
COMMENT ON COLUMN public.memes.message IS 'Optional short message (max 32 chars) shown when hovering over the meme on the board';
COMMENT ON COLUMN public.memes.order_id IS 'Unique Pakasir payment order ID';
COMMENT ON COLUMN public.memes.price IS 'Price in IDR calculated at upload time';
COMMENT ON COLUMN public.memes.payment_status IS 'Payment state: PENDING (awaiting), PAID (confirmed), EXPIRED (timed out)';

-- ======================
-- 2. INDEXES
-- ======================
CREATE INDEX idx_memes_payment_status ON public.memes (payment_status);
CREATE INDEX idx_memes_order_id ON public.memes (order_id);
CREATE INDEX idx_memes_created_at ON public.memes (created_at DESC);

-- ======================
-- 3. ROW LEVEL SECURITY
-- ======================
ALTER TABLE public.memes ENABLE ROW LEVEL SECURITY;

-- SELECT: Public can only read PAID memes
CREATE POLICY "Only paid memes are publicly viewable"
ON public.memes FOR SELECT
USING (payment_status = 'PAID');

-- INSERT / UPDATE / DELETE: No public policies.
-- Only the service_role key (used in API routes) can modify data.
-- This prevents anyone from using the anon key to insert/update/delete directly.

-- ======================
-- 4. STORAGE BUCKET (optional)
-- ======================
-- If you use Supabase Storage instead of Cloudinary, uncomment below:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('memes', 'memes', true);
-- CREATE POLICY "Public read meme images" ON storage.objects FOR SELECT USING (bucket_id = 'memes');

-- =============================================================
-- DONE! After running this:
-- 1. Go to Authentication → Policies to verify only 1 policy exists (SELECT for PAID)
-- 2. Copy your project URL and anon key to .env.local
-- 3. Copy the service_role key to .env.local (SUPABASE_SERVICE_ROLE_KEY)
-- 4. Set WEBHOOK_SECRET in .env.local
-- =============================================================
