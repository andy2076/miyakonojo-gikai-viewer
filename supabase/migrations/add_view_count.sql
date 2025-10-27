-- Add view_count column to question_cards table

ALTER TABLE question_cards
ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

-- Create index for sorting by view_count
CREATE INDEX IF NOT EXISTS idx_question_cards_view_count ON question_cards(view_count DESC);

-- Update existing records to have view_count = 0
UPDATE question_cards SET view_count = 0 WHERE view_count IS NULL;
