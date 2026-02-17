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

module.exports = { sendEmail };
