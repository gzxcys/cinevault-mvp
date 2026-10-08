import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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

// ============================================================
// Общий тёмный HTML-шаблон
// ============================================================
function darkEmailTemplate({ title, message, buttonText, buttonLink, footer }) {
  return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #0A0A0A;
          color: #FFFFFF;
          margin: 0;
          padding: 40px 20px;
        }
        .container {
          max-width: 520px;
          margin: 0 auto;
          background: #151515;
          border-radius: 4px;
          padding: 40px;
          border: 1px solid #262626;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 24px;
          letter-spacing: 0.05em;
        }
        .logo span { color: #E50914; }
        h1 {
          font-size: 22px;
          margin: 0 0 16px 0;
          font-weight: 700;
        }
        p {
          color: #A3A3A3;
          line-height: 1.6;
          margin: 0 0 16px 0;
        }
        .button {
          display: inline-block;
          background: #E50914;
          color: #FFFFFF !important;
          text-decoration: none;
          font-weight: 600;
          padding: 14px 28px;
          border-radius: 4px;
          margin: 16px 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-size: 14px;
        }
        .link {
          word-break: break-all;
          font-size: 12px;
          color: #525252;
        }
        .footer {
          color: #525252;
          font-size: 12px;
          margin-top: 24px;
          border-top: 1px solid #262626;
          padding-top: 16px;
        }
        .accent {
          position: relative;
          display: inline-block;
        }
        .accent::after {
          content: '';
          position: absolute;
          left: 0; right: 0; bottom: -2px;
          height: 2px;
          background: #E50914;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">CINE<span>VAULT</span></div>
        <h1>${title}</h1>
        <p>${message}</p>
        <a href="${buttonLink}" class="button">${buttonText}</a>
        <p style="margin-top: 24px;">Если кнопка не работает, скопируй ссылку в браузер:</p>
        <p class="link">${buttonLink}</p>
        <div class="footer">${footer}</div>
      </div>
    </body>
    </html>
  `;
}

// ============================================================
// Подтверждение email
// ============================================================
export async function sendVerificationEmail(to, name, token) {
  const link = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  const html = darkEmailTemplate({
    title: `Привет, ${name || "друг"}! 👋`,
    message:
      "Спасибо за регистрацию в CineVault. Чтобы начать пользоваться приложением, подтверди свой email — это один клик.",
    buttonText: "ПОДТВЕРДИТЬ EMAIL",
    buttonLink: link,
    footer:
      "Ссылка действительна 24 часа. Если ты не регистрировался — просто проигнорируй это письмо.",
  });

  const text = `
Привет, ${name || "друг"}!

Спасибо за регистрацию в CineVault.
Подтверди свой email по ссылке:
${link}

Если ты не регистрировался — проигнорируй это письмо.
  `.trim();

  return transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: "Подтверди свой email — CineVault",
    text,
    html,
  });
}

// ============================================================
// Восстановление пароля
// ============================================================
export async function sendPasswordResetEmail(to, name, token) {
  const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  const html = darkEmailTemplate({
    title: `Сброс пароля ${name ? ", " + name : ""}`,
    message:
      "Ты запросил сброс пароля в CineVault. Нажми кнопку ниже, чтобы установить новый пароль. Если это был не ты — просто проигнорируй это письмо, твой пароль останется прежним.",
    buttonText: "УСТАНОВИТЬ НОВЫЙ ПАРОЛЬ",
    buttonLink: link,
    footer: "Ссылка действительна 1 час. Никому не передавай её.",
  });

  const text = `
Сброс пароля CineVault

Установи новый пароль по ссылке:
${link}

Ссылка действительна 1 час. Если это был не ты — проигнорируй письмо.
  `.trim();

  return transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: "Сброс пароля — CineVault",
    text,
    html,
  });
}
