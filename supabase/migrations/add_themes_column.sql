-- 質問カードテーブルにテーマ配列カラムを追加
ALTER TABLE question_cards
ADD COLUMN IF NOT EXISTS themes jsonb DEFAULT '[]'::jsonb;

-- インデックスを追加してテーマ配列の検索を高速化
CREATE INDEX IF NOT EXISTS idx_question_cards_themes
ON question_cards USING gin (themes);

-- コメントを追加
COMMENT ON COLUMN question_cards.themes IS 'テーマの配列。各テーマは {theme_number, theme_title, question_point, answer_point, discussion_point, affected_people} の構造を持つ';
