# コマドリ

空いている時間をリンクで共有して、相手に予定を入れてもらう日程調整アプリ。

- 所有者の画面（`/me`、Googleログイン必須）：共有リンクを1本だけ相手に渡す。登録した相手ごとに「カレンダーに表示する予定名」（家庭訪問など）を決める
- 相手の画面（`/b/[slug]`、メールアドレスとパスワードでログイン必須）：はじめての人はリンクから自分で登録し、他の人が使っていない色を選ぶ。予約の長さ（15分単位）と開始時間を選ぶと5分間仮押さえされ、その間に確定する
- 相手には、自分の予約だけが中身つきで見え、他の人の予定や所有者の予定は「予定あり」と表示される
- 確定すると、所有者のGoogleカレンダーに「その相手の予定名」で予定が入り、所有者のメールアドレスに通知が届く。相手の名前や用件はGoogleカレンダーに書かない

数値（コマの長さ、予約の長さ、受付時間、仮押さえの時間など）は `src/config/scheduling.ts`、相手の色は `src/config/colors.ts`、パスワードの長さなどは `src/config/guests.ts` にまとまっている。

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
2. OAuth 同意画面を作り、スコープに `calendar.freebusy` と `calendar.events.owned` を追加し、テストユーザーに自分を追加する
3. OAuth クライアント（ウェブアプリ）を作り、承認済みリダイレクトURIに `${APP_URL}/api/auth/google/callback` を入れる

`npm run build` の中で `prisma migrate deploy` が走るので、Vercel のデプロイ時にDBのテーブルも作られる。
