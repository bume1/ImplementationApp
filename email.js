const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.EMAIL_FROM_ADDRESS || 'no-reply@thrive365labs.com';
const FROM_NAME = 'Thrive 365 Labs';

async function sendEmail(to, subject, body, options = {}) {
  try {
    const payload = {
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      text: body,
    };

    if (options.htmlBody) {
      payload.html = options.htmlBody;
    }

    const result = await resend.emails.send(payload);
    console.log('Email sent:', result);
    return { success: true, id: result.id };
  } catch (error) {
    console.error('Email send failed:', error);
    return { success: false, error: error.message };
  }
}

async function sendBulkEmail(recipients, subject, body, options = {}) {
  const results = [];
  for (const recipient of recipients) {
    const to = typeof recipient === 'string' ? recipient : recipient.email;
    const result = await sendEmail(to, subject, body, options);
    results.push({ email: to, ...result });
    // Small delay between sends to avoid rate limits
    if (recipients.length > 5) {
      await new Promise(r => setTimeout(r, 100));
    }
  }
  const sent = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success);
  console.log(`[BULK EMAIL] Sent ${sent}/${recipients.length}, ${failed.length} failed`);
  return { sent, failed: failed.length, total: recipients.length, results };
}

module.exports = { sendEmail, sendBulkEmail };
