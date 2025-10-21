# 都城市議会可視化アプリ

## プロジェクト概要

**プロジェクト名:** 都城市議会 見える化アプリ

**目的:**
都城市議会の議員別質問回数・内容を可視化し、市民に透明性を提供することで、より開かれた議会運営を実現します。市民が議員の活動を容易に理解できるようにすることで、地方政治への関心と参加を促進します。

## 技術スタック

- **フロントエンド:** Next.js 15 (App Router)
- **言語:** TypeScript (strict mode)
- **データベース:** Supabase (PostgreSQL)
- **データ可視化:** Chart.js
- **スタイリング:** Tailwind CSS
- **デプロイ:** Vercel (予定)

## ディレクトリ構造

```
miyakonojo-gikai-viewer/
├── .claude/              # Claude関連のドキュメント
│   └── CLAUDE.md        # このファイル
├── app/                 # Next.js App Router
│   ├── layout.tsx       # ルートレイアウト
│   ├── page.tsx         # ランディングページ
│   ├── dashboard/       # ダッシュボードページ
│   └── api/             # APIルート
├── components/          # Reactコンポーネント
│   ├── ui/             # 共通UIコンポーネント
│   └── charts/         # チャート関連コンポーネント
├── lib/                # ユーティリティ・ライブラリ
│   ├── supabase.ts     # Supabaseクライアント
│   └── utils.ts        # 汎用ユーティリティ関数
├── types/              # TypeScript型定義
│   └── database.ts     # データベース型定義
├── public/             # 静的ファイル
└── .env.local          # 環境変数（Git管理外）
```

## コーディング規約

### TypeScript

- **Strict Mode:** `tsconfig.json` で strict モードを有効化
- **型定義:** 明示的な型定義を推奨（any型の使用は避ける）
- **命名規則:**
  - コンポーネント: PascalCase (例: `QuestionChart.tsx`)
  - 関数・変数: camelCase (例: `fetchQuestions`)
  - 定数: UPPER_SNAKE_CASE (例: `MAX_QUESTIONS`)
  - 型・インターフェース: PascalCase (例: `Question`, `CouncilMember`)

### Next.js App Router

- **Server/Client分離:**
  - デフォルトはServer Component
  - クライアントインタラクションが必要な場合のみ `'use client'` を使用
  - データフェッチはServer Componentで実行
- **ファイル命名:**
  - ページ: `page.tsx`
  - レイアウト: `layout.tsx`
  - ローディング: `loading.tsx`
  - エラー: `error.tsx`

### コンポーネント設計

- **単一責任の原則:** 各コンポーネントは1つの責務を持つ
- **Props型定義:** インターフェースで明示的に定義
- **再利用性:** 汎用的なUIコンポーネントは `components/ui/` に配置

### スタイリング

- **Tailwind CSS:** ユーティリティクラスを使用
- **レスポンシブ:** モバイルファーストで設計（sm, md, lg ブレークポイント）
- **ダークモード:** 将来的な対応を考慮

## データベース設計（予定）

### テーブル構成

1. **council_members** - 議員情報
   - id, name, party, district, elected_year, etc.

2. **questions** - 質問情報
   - id, council_member_id, session_date, title, category, content, etc.

3. **sessions** - 議会セッション
   - id, session_date, session_type, etc.

## 開発ワークフロー

1. ローカル開発: `npm run dev`
2. ビルド: `npm run build`
3. 型チェック: `npm run type-check`
4. リント: `npm run lint`

## 環境変数

```.env.local
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 今後の実装予定

- [ ] ランディングページ
- [ ] Supabase統合
- [ ] 議員一覧ページ
- [ ] 質問データ可視化ダッシュボード
- [ ] 検索・フィルタリング機能
- [ ] データ更新機能（管理者用）
