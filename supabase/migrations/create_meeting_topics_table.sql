-- 可決トピック（議会審議内容まとめ）テーブルの作成

CREATE TABLE IF NOT EXISTS meeting_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  meeting_title TEXT NOT NULL,
  title TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE,
  description TEXT,
  content_data JSONB NOT NULL DEFAULT '{"topics": []}',
  summary TEXT[],
  supplementary_budget JSONB,
  total_budget_after BIGINT,
  published BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX idx_meeting_topics_meeting_id ON meeting_topics(meeting_id);
CREATE INDEX idx_meeting_topics_meeting_title ON meeting_topics(meeting_title);
CREATE INDEX idx_meeting_topics_published ON meeting_topics(published);
CREATE INDEX idx_meeting_topics_display_order ON meeting_topics(display_order);

-- updated_at の自動更新トリガー
CREATE OR REPLACE FUNCTION update_meeting_topics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_meeting_topics_updated_at
BEFORE UPDATE ON meeting_topics
FOR EACH ROW
EXECUTE FUNCTION update_meeting_topics_updated_at();

-- RLSポリシー（必要に応じて）
ALTER TABLE meeting_topics ENABLE ROW LEVEL SECURITY;

-- 公開されたトピックは誰でも閲覧可能
CREATE POLICY "Public meeting topics are viewable by everyone"
ON meeting_topics FOR SELECT
USING (published = true);

-- 管理者は全ての操作が可能（ここでは簡易的に全てのユーザーに権限を付与）
-- 実際の運用では、管理者ロールを確認するポリシーに変更してください
CREATE POLICY "Admins can do anything with meeting topics"
ON meeting_topics FOR ALL
USING (true)
WITH CHECK (true);
