import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Создаём транспорт для Gmail SMTP.
// В продакшене можно заменить на SendGrid, Resend, Mailgun и т.д.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Проверяем соединение при старте (только в dev, чтобы не тормозить prod)
if (process.env.NODE_ENV === "development") {
  transporter.verify((error) => {
    if (error) {
      console.error("❌ SMTP: не удалось подключиться к Gmail");
      console.error("   Проверь EMAIL_USER и EMAIL_PASS в .env");
      console.error("   Ошибка:", error.message);
    } else {
      console.log("📧 SMTP: Gmail готов к отправке писем");
    }
  });
}

/**
 * Отправить письмо с ссылкой подтверждения email.
 */
export async function sendVerificationEmail(to, name, token) {
  const link = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #0F172A;
          color: #FFFFFF;
          margin: 0;
          padding: 40px 20px;
        }
        .container {
          max-width: 520px;
          margin: 0 auto;
          background: #1E293B;
          border-radius: 16px;
          padding: 40px;
          border: 1px solid #334155;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 24px;
        }
        .logo span { color: #7DF9FF; }
        h1 {
          font-size: 22px;
          margin: 0 0 16px 0;
        }
        p {
          color: #CBD5E1;
          line-height: 1.6;
          margin: 0 0 16px 0;
        }
        .button {
          display: inline-block;
          background: #7DF9FF;
          color: #0F172A !important;
          text-decoration: none;
          font-weight: 600;
          padding: 14px 28px;
          border-radius: 10px;
          margin: 16px 0;
        }
        .link {
          word-break: break-all;
          font-size: 12px;
          color: #64748B;
        }
        .footer {
          color: #64748B;
          font-size: 12px;
          margin-top: 24px;
          border-top: 1px solid #334155;
          padding-top: 16px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">Cine<span>Vault</span></div>
        <h1>Привет, ${name || "друг"}! 👋</h1>
        <p>
          Спасибо за регистрацию в CineVault. Чтобы начать пользоваться
          приложением, подтверди свой email — это один клик.
        </p>
        <a href="${link}" class="button">Подтвердить email</a>
        <p style="margin-top: 24px;">
          Если кнопка не работает, скопируй ссылку в браузер:
        </p>
        <p class="link">${link}</p>
        <div class="footer">
          Ссылка действительна 24 часа. Если ты не регистрировался в CineVault —
          просто проигнорируй это письмо.
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Привет, ${name || "друг"}!

Спасибо за регистрацию в CineVault.
Подтверди свой email по ссылке:
${link}

Если ты не регистрировался — проигнорируй это письмо.
  `.trim();

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: "Подтверди свой email — CineVault",
    text,
    html,
  });

  return info;
}
