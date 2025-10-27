-- Add columns for 質問ポイント3 and 回答ポイント3
ALTER TABLE question_cards
ADD COLUMN IF NOT EXISTS gpt_question_point3 text,
ADD COLUMN IF NOT EXISTS gpt_answer_point3 text;

-- Add index for better query performance (optional)
CREATE INDEX IF NOT EXISTS idx_question_cards_gpt_point3
ON question_cards (gpt_question_point3)
WHERE gpt_question_point3 IS NOT NULL;
