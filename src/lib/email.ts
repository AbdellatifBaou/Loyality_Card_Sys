import { Resend } from 'resend';

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY is not set. Email not sent.');
      return { success: false, error: 'No API key' };
    }
    const resend = new Resend(process.env.RESEND_API_KEY);

    const data = await resend.emails.send({
      from: 'Marketif Treue <info@marketif.de>', // Use a verified domain here, e.g. info@marketif.de
      to,
      subject,
      html,
    });
    return { success: true, data };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}
