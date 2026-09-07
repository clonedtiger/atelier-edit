import nodemailer from 'nodemailer';
import { WhatsNewPost } from './whatsNew';

export interface EmailDigestParams {
  email: string;
  name?: string | null;
  styleAesthetic?: string | null;
  posts: WhatsNewPost[];
}

export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  simulated?: boolean;
  error?: string;
}

/**
 * Returns a nodemailer transporter.
 * Uses environment SMTP configuration if provided, otherwise returns null for simulated logging mode.
 */
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  return null;
}

/**
 * Generates an elegant, luxury editorial HTML email template for the What's New Digest.
 */
function generateDigestHtml(params: EmailDigestParams, appUrl: string): string {
  const { name, styleAesthetic, posts } = params;
  const clientName = name || 'Valued Client';
  const issueDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const postCardsHtml = posts
    .map((post) => {
      const tagsHtml = (post.tags || [])
        .map(
          (t) =>
            `<span style="display: inline-block; background-color: rgba(212, 175, 55, 0.12); border: 1px solid rgba(212, 175, 55, 0.3); color: #d4af37; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 12px; margin-right: 5px; margin-bottom: 5px;">#${t.replace(/^#/, '')}</span>`
        )
        .join(' ');

      const imageHtml =
        post.imageUrl && post.imageUrl.startsWith('http')
          ? `<div style="margin-bottom: 14px;">
               <img src="${post.imageUrl}" alt="${post.title}" style="width: 100%; max-height: 320px; object-fit: cover; border-radius: 6px; display: block;" />
             </div>`
          : '';

      return `
        <div style="background-color: #1a1c23; border: 1px solid #2a2d37; border-radius: 8px; padding: 20px; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
          ${imageHtml}
          <div style="margin-bottom: 8px;">
            <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: #d4af37; background-color: rgba(212, 175, 55, 0.15); padding: 3px 7px; border-radius: 3px; font-weight: 700;">
              ${post.source || 'Editorial Feed'}
            </span>
          </div>
          <h2 style="color: #ffffff; font-size: 18px; font-weight: 700; margin: 8px 0 10px 0; line-height: 1.35; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            ${post.title}
          </h2>
          <p style="color: #c5c7d0; font-size: 14px; line-height: 1.6; margin: 0 0 14px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            ${post.summary}
          </p>
          ${tagsHtml ? `<div>${tagsHtml}</div>` : ''}
        </div>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Atelier Edit — Style Stream Digest</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f1013; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0f1013; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">
          
          <!-- Header Branding -->
          <tr>
            <td style="text-align: center; padding-bottom: 28px;">
              <h1 style="color: #d4af37; font-size: 24px; font-weight: 800; letter-spacing: 0.25em; text-transform: uppercase; margin: 0 0 6px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                ATELIER EDIT
              </h1>
              <p style="color: #8b8f9e; font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; margin: 0;">
                Curated Style Stream Intelligence &bull; ${issueDate}
              </p>
            </td>
          </tr>

          <!-- Welcome & Aesthetic Card -->
          <tr>
            <td style="background: linear-gradient(135deg, #181a22 0%, #1e202a 100%); border: 1px solid #2e313d; border-radius: 8px; padding: 24px; margin-bottom: 24px; color: #ffffff;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #ffffff;">
                Good day, ${clientName}
              </h3>
              <p style="margin: 0 0 12px 0; color: #b2b5c2; font-size: 13.5px; line-height: 1.55;">
                Your latest fashion intelligence and personal inspiration feeds have been synchronized. Here are your newly curated editorial style coordinates:
              </p>
              ${
                styleAesthetic
                  ? `<div style="font-size: 12px; color: #d4af37; background: rgba(212, 175, 55, 0.08); padding: 8px 12px; border-left: 2px solid #d4af37; border-radius: 2px;">
                       <strong>Active Style DNA:</strong> ${styleAesthetic}
                     </div>`
                  : ''
              }
            </td>
          </tr>

          <tr><td height="24" style="height: 24px;"></td></tr>

          <!-- Post Cards -->
          <tr>
            <td>
              ${postCardsHtml}
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 16px 0 36px 0;">
              <a href="${appUrl}" target="_blank" style="display: inline-block; background-color: #d4af37; color: #000000; text-decoration: none; font-size: 13px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; padding: 14px 32px; border-radius: 4px; box-shadow: 0 4px 14px rgba(212, 175, 55, 0.35);">
                Open Atelier Edit Studio &rarr;
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="text-align: center; border-top: 1px solid #232631; padding-top: 24px; color: #6a6e7c; font-size: 11px; line-height: 1.6;">
              <p style="margin: 0 0 6px 0;">
                You received this digest because you refreshed your What's New style stream at <a href="${appUrl}" style="color: #8b8f9e; text-decoration: underline;">Atelier Edit</a>.
              </p>
              <p style="margin: 0;">
                &copy; ${new Date().getFullYear()} Atelier Edit. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Generates plain text fallback for email clients that do not support HTML.
 */
function generateDigestPlainText(params: EmailDigestParams, appUrl: string): string {
  const { name, posts } = params;
  const clientName = name || 'Valued Client';

  const postsText = posts
    .map((p, i) => {
      const tags = (p.tags || []).map((t) => `#${t.replace(/^#/, '')}`).join(' ');
      return `[${i + 1}] ${p.title} (${p.source || 'Editorial Feed'})\n${p.summary}\n${tags}\n`;
    })
    .join('\n---\n\n');

  return `ATELIER EDIT — STYLE STREAM DIGEST
====================================
Hello ${clientName},

Your latest personalized editorial style stream has been refreshed:

${postsText}

View full interactive moodboard and closet pairings online:
${appUrl}

© ${new Date().getFullYear()} Atelier Edit.
`;
}

/**
 * Dispatches the What's New style stream digest to the user's email.
 * Operates gracefully with live SMTP or fallback sandbox console logging.
 */
export async function sendWhatsNewEmailDigest(params: EmailDigestParams): Promise<EmailDispatchResult> {
  const { email, posts } = params;

  if (!email || !email.includes('@')) {
    console.warn(`[EMAIL DIGEST] Cannot send email: invalid recipient "${email}"`);
    return { success: false, error: 'Invalid recipient email address' };
  }

  if (!posts || posts.length === 0) {
    console.log('[EMAIL DIGEST] No posts to send in digest. Skipping.');
    return { success: true, simulated: true };
  }

  const appUrl = process.env.APP_URL || 'https://atelier-edit-2kmaabi2ya-nw.a.run.app';
  const fromAddress = process.env.EMAIL_FROM || 'Atelier Edit <digest@atelier-edit.com>';
  const subject = `Your Atelier Style Stream Digest — ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;

  const html = generateDigestHtml(params, appUrl);
  const text = generateDigestPlainText(params, appUrl);

  const transporter = getTransporter();

  if (transporter) {
    try {
      console.log(`[EMAIL DIGEST] Sending SMTP email to ${email} via ${process.env.SMTP_HOST}...`);
      const info = await transporter.sendMail({
        from: fromAddress,
        to: email,
        subject,
        html,
        text,
      });

      console.log(`[EMAIL DIGEST] Email sent successfully! Message ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown SMTP dispatch error';
      console.error(`[EMAIL DIGEST] Failed to send email via SMTP: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  // Simulated / sandbox dispatch (useful when SMTP credentials are not yet configured)
  console.log('\n==================================================');
  console.log('[EMAIL DIGEST DISPATCH]');
  console.log(`To: ${email}`);
  console.log(`From: ${fromAddress}`);
  console.log(`Subject: ${subject}`);
  console.log(`Digest Items: ${posts.length} editorial posts`);
  posts.forEach((p, idx) => {
    console.log(`  ${idx + 1}. [${p.source}] ${p.title}`);
  });
  console.log('Status: Dispatched via standard stream logging (SMTP credentials not configured)');
  console.log('==================================================\n');

  return { success: true, simulated: true };
}
