import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

// Email sending helper
export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string;
  subject: string;
  react: React.ReactElement;
}) {
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "VibeCode <noreply@vibecode.app>",
    to,
    subject,
    react,
  });

  if (error) {
    console.error("Failed to send email:", error);
    throw new Error(error.message);
  }

  return data;
}
