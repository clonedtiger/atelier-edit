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
 * Escapes text for safe interpolation into HTML. Post titles and summaries are
 * model-generated and names/aesthetics are user-supplied, so none of it is trusted.
 */
export function escapeHtml(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/**
 * Generates the What's New digest email in the app's warm ivory / pine editorial palette.
 */
function generateDigestHtml(params: EmailDigestParams, appUrl: string): string {
  const { name, styleAesthetic, posts } = params;
  const clientName = escapeHtml(name || 'Valued Client');
  const safeAppUrl = escapeHtml(appUrl);
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
            `<span style="display: inline-block; background-color: #ECEFE9; color: #35443B; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 12px; margin: 0 5px 5px 0; font-family: ${SANS};">${escapeHtml(t.replace(/^#/, ''))}</span>`
        )
        .join(' ');

      const imageHtml =
        post.imageUrl && post.imageUrl.startsWith('https://')
          ? `<img src="${escapeHtml(post.imageUrl)}" alt="${escapeHtml(post.title)}" width="600" style="width: 100%; max-height: 320px; object-fit: cover; display: block; border: 0;" />`
          : '';

      return `
        <div style="background-color: #FFFFFF; border: 1px solid #E7DFD3; border-radius: 6px; overflow: hidden; margin-bottom: 24px;">
          ${imageHtml}
          <div style="padding: 22px 24px;">
            <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.16em; color: #6E6D74; font-weight: 600; font-family: ${SANS};">
              ${escapeHtml(post.source || 'Editorial Feed')}
            </div>
            <h2 style="color: #18181A; font-size: 24px; font-weight: 400; margin: 8px 0 10px 0; line-height: 1.25; font-family: ${SERIF};">
              ${escapeHtml(post.title)}
            </h2>
            <p style="color: #56565E; font-size: 14px; line-height: 1.65; margin: 0 0 14px 0; font-family: ${SANS};">
              ${escapeHtml(post.summary)}
            </p>
            ${post.suggestedPiece ? `<p style="color: #18181A; font-size: 13px; margin: 0 0 14px 0; font-family: ${SANS};"><strong style="font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #6E6D74;">Worth adding</strong>&nbsp; ${escapeHtml(post.suggestedPiece)}</p>` : ''}
            ${tagsHtml ? `<div>${tagsHtml}</div>` : ''}
            ${post.sourceUrl && /^https?:\/\//.test(post.sourceUrl) ? `<p style="margin: 14px 0 0 0; font-family: ${SANS};"><a href="${escapeHtml(post.sourceUrl)}" style="color: #35443B; font-size: 13px; font-weight: 600; text-decoration: none;">Read at ${escapeHtml(post.source)} &rarr;</a></p>` : ''}
          </div>
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
<body style="margin: 0; padding: 0; background-color: #FAF8F4; font-family: ${SANS}; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAF8F4; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">

          <!-- Masthead -->
          <tr>
            <td style="text-align: center; padding-bottom: 24px; border-bottom: 1px solid #E7DFD3;">
              <h1 style="color: #18181A; font-size: 30px; font-weight: 300; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 6px 0; font-family: ${SERIF};">
                Atelier Edit
              </h1>
              <p style="color: #56565E; font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; margin: 0; font-weight: 600;">
                The Personal Style Journal &bull; ${issueDate}
              </p>
            </td>
          </tr>

          <tr><td height="24" style="height: 24px;"></td></tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 0 4px 24px 4px;">
              <p style="margin: 0 0 8px 0; font-size: 20px; color: #18181A; font-family: ${SERIF};">
                Good day, ${clientName}
              </p>
              <p style="margin: 0; color: #56565E; font-size: 14px; line-height: 1.6;">
                Your style stream has been refreshed with new editorial notes drawn from your feeds and inspirations.
              </p>
              ${
                styleAesthetic
                  ? `<p style="margin: 12px 0 0 0; font-size: 12px; color: #35443B; padding: 8px 12px; border-left: 2px solid #35443B; background: #ECEFE9;">
                       <strong>Style DNA:</strong> ${escapeHtml(styleAesthetic)}
                     </p>`
                  : ''
              }
            </td>
          </tr>

          <!-- Post Cards -->
          <tr>
            <td>
              ${postCardsHtml}
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 12px 0 36px 0;">
              <a href="${safeAppUrl}" target="_blank" style="display: inline-block; background-color: #35443B; color: #FAF8F4; text-decoration: none; font-size: 12px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; padding: 14px 32px; border-radius: 4px;">
                Open Atelier Edit &rarr;
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="text-align: center; border-top: 1px solid #E7DFD3; padding-top: 24px; color: #8E8D94; font-size: 11px; line-height: 1.6;">
              <p style="margin: 0 0 6px 0;">
                You received this digest because you refreshed your What's New style stream at <a href="${safeAppUrl}" style="color: #56565E; text-decoration: underline;">Atelier Edit</a>.
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
      const extra = [p.suggestedPiece ? `Worth adding: ${p.suggestedPiece}` : '', p.sourceUrl ? `Read: ${p.sourceUrl}` : ''].filter(Boolean).join('\n');
      return `[${i + 1}] ${p.title} (${p.source || 'Editorial Feed'})\n${p.summary}\n${extra ? `${extra}\n` : ''}${tags}\n`;
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

  const appUrl = process.env.APP_URL || 'https://atelieredit.info';
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

/**
 * Emails a password reset code. Without SMTP configured the code cannot be delivered; in
 * development it is logged so the flow can be tested, but never in production, where server
 * logs must not contain working reset codes.
 */
export async function sendPasswordResetEmail(email: string, code: string): Promise<EmailDispatchResult> {
  const transporter = getTransporter();
  const fromAddress = process.env.EMAIL_FROM || 'Atelier Edit <digest@atelier-edit.com>';

  if (!transporter) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[PASSWORD RESET] SMTP is not configured, so the reset code could not be emailed.');
      return { success: false, error: 'Email is not configured' };
    }
    console.log(`[PASSWORD RESET] (development) code for ${email}: ${code}`);
    return { success: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: email,
      subject: 'Your Atelier Edit password reset code',
      text: `Your password reset code is ${code}. It expires in 15 minutes.\n\nIf you did not ask to reset your password, you can ignore this email.`,
      html: `<p style="font-family: ${SANS}; font-size: 15px; color: #18181A;">Your password reset code is</p>
<p style="font-family: ${SERIF}; font-size: 32px; letter-spacing: 0.2em; color: #18181A; margin: 8px 0 16px;">${escapeHtml(code)}</p>
<p style="font-family: ${SANS}; font-size: 13px; color: #56565E;">It expires in 15 minutes. If you did not ask to reset your password, you can ignore this email.</p>`,
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown SMTP dispatch error';
    console.error(`[PASSWORD RESET] Failed to send reset email: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}
