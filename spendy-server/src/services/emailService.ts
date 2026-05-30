const nodemailer = require("nodemailer") as any;

type ResetMailArgs = {
  to: string;
  resetLink: string;
};

type ResetMailResult = {
  messageId: string;
  previewUrl?: string;
};

const createConfiguredTransporter = async () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && port && user && pass) {
    return nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: { user, pass },
    });
  }

  if (process.env.SMTP_USE_ETHEREAL === "true" && process.env.NODE_ENV !== "test") {
    try {
      const testAccount = await nodemailer.createTestAccount();
      return nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } catch {
      // Fall back to local JSON transport when Ethereal is unavailable.
    }
  }

  return nodemailer.createTransport({ jsonTransport: true });
};

export const sendPasswordResetEmail = async ({ to, resetLink }: ResetMailArgs): Promise<ResetMailResult> => {
  const transporter = await createConfiguredTransporter();
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "spendy@example.local",
    to,
    subject: "Spendy password reset",
    text: `Reset your password using this link: ${resetLink}`,
    html: `<p>Reset your password using this link:</p><p><a href="${resetLink}">${resetLink}</a></p>`,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info) ?? undefined;

  return {
    messageId: info.messageId,
    previewUrl,
  };
};

