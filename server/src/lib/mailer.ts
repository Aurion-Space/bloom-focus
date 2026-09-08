import nodemailer, { type Transporter } from 'nodemailer';
import { getSmtpConfig } from '../config.js';

let cachedTransporter: Transporter | null = null;
let cachedFor = '';

export function isEmailEnabled(): boolean {
  return getSmtpConfig() !== null;
}

function getTransporter(): Transporter | null {
  const config = getSmtpConfig();
  if (!config) return null;

  // Rebuild only if the credentials actually changed, so we keep one pooled
  // connection instead of opening a socket per message.
  const fingerprint = `${config.host}:${config.port}:${config.user}`;
  if (!cachedTransporter || cachedFor !== fingerprint) {
    cachedTransporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
      pool: true,
      maxConnections: 2,
    });
    cachedFor = fingerprint;
  }
  return cachedTransporter;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] as string
  ));
}

export async function sendPatternResetEmail(
  to: string,
  gardenId: string,
  resetUrl: string,
  ttlMinutes: number
): Promise<void> {
  const transporter = getTransporter();
  const config = getSmtpConfig();
  if (!transporter || !config) throw new Error('smtp_not_configured');

  const safeGarden = escapeHtml(gardenId);
  const safeUrl = escapeHtml(resetUrl);

  await transporter.sendMail({
    from: config.from,
    to,
    subject: `Reset the pattern for your garden @${gardenId}`,
    text: [
      `Someone asked to reset the pattern for your BloomFocus garden, @${gardenId}.`,
      '',
      'Open this link to draw a new pattern:',
      resetUrl,
      '',
      `The link works once and expires in ${ttlMinutes} minutes.`,
      '',
      "If this wasn't you, ignore this message — your garden is untouched and your",
      'pattern still works.',
    ].join('\n'),
    html: `
      <div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#3B2E2A">
        <p style="font-size:22px;margin:0 0 4px">&#10047;</p>
        <h1 style="font-size:22px;font-weight:600;margin:0 0 16px">Reset your pattern</h1>
        <p style="font-size:15px;line-height:1.6;margin:0 0 20px;color:#6B5D54">
          Someone asked to reset the pattern for your garden
          <strong style="color:#3B2E2A">@${safeGarden}</strong>.
        </p>
        <p style="margin:0 0 24px">
          <a href="${safeUrl}" style="display:inline-block;background:#E89AAE;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:15px;font-weight:600">Draw a new pattern</a>
        </p>
        <p style="font-size:13px;line-height:1.6;color:#A89A8E;margin:0 0 8px">
          The link works once and expires in ${ttlMinutes} minutes.
        </p>
        <p style="font-size:13px;line-height:1.6;color:#A89A8E;margin:0">
          If this wasn't you, ignore this message &mdash; your garden is untouched and your pattern still works.
        </p>
      </div>
    `,
  });
}
