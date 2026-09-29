import nodemailer from "nodemailer";
import { Resend } from "resend";

type Mail = { to: string; subject: string; text: string };

/**
 * メールを送る。送る手段は環境変数で決める。
 * 1. SMTP_USER と SMTP_PASS があれば SMTP（初期値は Gmail。パスワードは Google の「アプリ パスワード」）
 * 2. RESEND_API_KEY があれば Resend（送信先を自由にするには独自ドメインの認証が必要）
 * 3. どちらも無ければ、送らずにサーバーのログに出す（開発用）
 */
export async function sendMail(mail: Mail) {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) return sendBySmtp(mail);
  if (process.env.RESEND_API_KEY) return sendByResend(mail);
  console.log("[mail:dev]", JSON.stringify(mail, null, 2));
}

async function sendBySmtp(mail: Mail) {
  const user = process.env.SMTP_USER!;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user, pass: process.env.SMTP_PASS! },
  });
  try {
    // Gmail はログインしたアドレス以外を送信元にできないので、送信元は SMTP_USER にする
    await transport.sendMail({ from: `コマドリ <${user}>`, to: mail.to, subject: mail.subject, text: mail.text });
  } catch (e) {
    console.error("[mail] smtp failed", e);
  }
}

async function sendByResend(mail: Mail) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.MAIL_FROM!,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
  });
  if (error) console.error("[mail] resend failed", error);
}
