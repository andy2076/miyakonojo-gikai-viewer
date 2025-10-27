-- GPT分析データ用のカラムを追加
ALTER TABLE question_cards
ADD COLUMN IF NOT EXISTS faction text,
ADD COLUMN IF NOT EXISTS theme_title text,
ADD COLUMN IF NOT EXISTS gpt_question_point1 text,
ADD COLUMN IF NOT EXISTS gpt_answer_point1 text,
ADD COLUMN IF NOT EXISTS gpt_question_point2 text,
ADD COLUMN IF NOT EXISTS gpt_answer_point2 text,
ADD COLUMN IF NOT EXISTS gpt_discussion_point text,
ADD COLUMN IF NOT EXISTS gpt_affected_people text,
ADD COLUMN IF NOT EXISTS gpt_field_tags text[],
ADD COLUMN IF NOT EXISTS gpt_nature_tags text[];

-- インデックスを追加（検索高速化）
CREATE INDEX IF NOT EXISTS idx_question_cards_faction ON question_cards(faction);
CREATE INDEX IF NOT EXISTS idx_question_cards_gpt_field_tags ON question_cards USING GIN(gpt_field_tags);
CREATE INDEX IF NOT EXISTS idx_question_cards_gpt_nature_tags ON question_cards USING GIN(gpt_nature_tags);
