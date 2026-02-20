-- Migration: Add optional hover message to memes table
-- Run this in your Supabase SQL Editor

ALTER TABLE memes
  ADD COLUMN IF NOT EXISTS message VARCHAR(32) DEFAULT NULL;

-- Optional: comment for clarity
COMMENT ON COLUMN memes.message IS 'Optional short message (max 32 chars) shown when hovering over the meme on the board';
