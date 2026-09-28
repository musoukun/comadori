# コマドリ

空いている時間をリンクで共有して、相手に予定を入れてもらう日程調整アプリ。

- 所有者の画面（`/me`）：Googleカレンダーの予定と、自分で入れたブロックを見ながら共有リンクを渡す
- ゲストの画面（`/b/[slug]`）：空いているコマを選ぶと5分間仮押さえされ、その間に名前を入れて確定する
- 確定すると、所有者のメールアドレスに通知が届く

数値（コマの長さ、予約の長さ、受付時間、仮押さえの時間など）は `src/config/scheduling.ts` にまとまっている。

## ローカルで動かす

```bash
npm install
cp .env.example .env   # DATABASE_URL と SESSION_SECRET、OWNER_EMAIL を入れる
npx prisma migrate dev
npm run dev
```

`GOOGLE_CLIENT_ID` が空の間は、「Googleでログイン」を押すと `OWNER_EMAIL` の所有者として開発用ログインになる（Googleの予定は反映されない）。
`RESEND_API_KEY` が空の間は、メールは送らずサーバーログに出す。

## 本番に必要なもの

| 環境変数 | 用意するもの |
|---|---|
| `DATABASE_URL` | Neon などの Postgres（Vercel の Marketplace から追加できる） |
| `APP_URL` | デプロイ先のURL（例：`https://comadori.vercel.app`） |
| `SESSION_SECRET` | ランダムな長い文字列 |
| `OWNER_EMAIL` | ログインを許可する自分のGoogleアカウントのメールアドレス |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud Console で作る OAuth クライアント（ウェブアプリ） |
| `RESEND_API_KEY` / `MAIL_FROM` | Resend のAPIキーと送信元 |

Google Cloud Console での設定：

1. Google Calendar API を有効にする
2. OAuth 同意画面を作り、スコープに `calendar.freebusy` を追加し、テストユーザーに自分を追加する
3. OAuth クライアント（ウェブアプリ）を作り、承認済みリダイレクトURIに `${APP_URL}/api/auth/google/callback` を入れる

`npm run build` の中で `prisma migrate deploy` が走るので、Vercel のデプロイ時にDBのテーブルも作られる。
