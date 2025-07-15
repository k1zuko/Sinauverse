-- Add missing columns to game_participants table
ALTER TABLE public.game_participants 
ADD COLUMN IF NOT EXISTS current_question INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_finished BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP WITH TIME ZONE;

-- Add practice_started_at and practice_total_time to game_rooms for practice mode timing
ALTER TABLE public.game_rooms 
ADD COLUMN IF NOT EXISTS practice_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS practice_total_time INTEGER;

-- Update existing records to have proper default values
UPDATE public.game_participants 
SET current_question = 0 
WHERE current_question IS NULL;

UPDATE public.game_participants 
SET is_finished = false 
WHERE is_finished IS NULL;
