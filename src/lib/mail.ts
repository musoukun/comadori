import { Resend } from "resend";

type Mail = { to: string; subject: string; text: string };

/** メールを送る。RESEND_API_KEY が無ければサーバーログに出すだけ */
export async function sendMail(mail: Mail) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[mail:dev]", JSON.stringify(mail, null, 2));
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.MAIL_FROM!,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
  });
  if (error) console.error("[mail] failed", error);
}
