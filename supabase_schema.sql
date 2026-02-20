-- Create the table for storing meme data
CREATE TABLE public.memes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    image_url TEXT NOT NULL,
    x INTEGER NOT NULL CHECK (x >= 0 AND x <= 1000),
    y INTEGER NOT NULL CHECK (y >= 0 AND y <= 1000),
    width INTEGER NOT NULL CHECK (width > 0),
    height INTEGER NOT NULL CHECK (height > 0),
    link TEXT, -- Optional link to original content or user's site
    title TEXT, -- Alt text or title
    CONSTRAINT memes_bounds CHECK (x + width <= 1000 AND y + height <= 1000)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.memes ENABLE ROW LEVEL SECURITY;

-- Allow public read access (PAID memes only)
CREATE POLICY "Only paid memes are publicly viewable" 
ON public.memes FOR SELECT 
USING (payment_status = 'PAID');

-- INSERT / UPDATE / DELETE: No public policies.
-- Only the service_role key (used in API routes) can modify data.
-- This ensures all writes go through our secure API routes
-- which handle payment verification via Pakasir.
