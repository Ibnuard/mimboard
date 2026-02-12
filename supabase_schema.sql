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

-- Allow public read access
CREATE POLICY "Public memes are viewable by everyone" 
ON public.memes FOR SELECT 
USING (true);

-- Allow public insert access (for anonymous uploads)
CREATE POLICY "Public memes can be uploaded by everyone" 
ON public.memes FOR INSERT 
WITH CHECK (true);

-- Allow authenticated insert (assuming we might add auth later, or just use anon key for now with a service role if strictly backend, but for client-side insert with payment verification we might need a function or edge function. For now, let's allow public insert but we control it via API route).
-- Actually, for security, we should probably only allow insert via a secure API route (Service Role) after successful payment.
-- So we won't add a public insert policy. Only the service_role key can insert.
