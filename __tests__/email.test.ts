import { sendWhatsNewEmailDigest } from '@/lib/email';
import nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('Email Digest Module (src/lib/email.ts)', () => {
  const originalEnv = process.env;
  const mockPosts = [
    {
      id: 'post-1',
      title: 'Architectural Cashmere & Heavy Wool',
      summary: 'Sharply tailored overcoats paired with wide-leg wool trousers.',
      source: 'Vogue Runway',
      tags: ['Tailoring', 'Wool', 'Cashmere'],
      imageUrl: 'https://storage.googleapis.com/test-bucket/editorial-1.webp',
      createdAt: '2026-09-07T08:00:00.000Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('rejects invalid recipient email addresses', async () => {
    const result = await sendWhatsNewEmailDigest({
      email: 'not-an-email',
      posts: mockPosts,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid recipient email');
  });

  it('skips dispatch if posts array is empty', async () => {
    const result = await sendWhatsNewEmailDigest({
      email: 'client@atelier-edit.com',
      posts: [],
    });

    expect(result.success).toBe(true);
    expect(result.simulated).toBe(true);
  });

  it('falls back to sandbox/console simulation mode when SMTP credentials are not configured', async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const result = await sendWhatsNewEmailDigest({
      email: 'alexander@example.com',
      name: 'Alexander',
      styleAesthetic: 'Minimalist Quiet Luxury',
      posts: mockPosts,
    });

    expect(result.success).toBe(true);
    expect(result.simulated).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[EMAIL DIGEST DISPATCH]'));

    consoleSpy.mockRestore();
  });

  it('dispatches SMTP email when SMTP credentials are fully provided', async () => {
    process.env.SMTP_HOST = 'smtp.sendgrid.net';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'apikey';
    process.env.SMTP_PASS = 'SG.test-key';
    process.env.EMAIL_FROM = 'Atelier Edit <digest@atelier-edit.com>';

    const mockSendMail = jest.fn().mockResolvedValue({
      messageId: '<msg-12345@atelier-edit.com>',
    });

    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail,
    });

    const result = await sendWhatsNewEmailDigest({
      email: 'keith@sparky.com',
      name: 'Keith Misson',
      styleAesthetic: 'Tailoring & Quiet Luxury',
      posts: mockPosts,
    });

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: { user: 'apikey', pass: 'SG.test-key' },
      })
    );

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'keith@sparky.com',
        from: 'Atelier Edit <digest@atelier-edit.com>',
        subject: expect.stringContaining('Your Atelier Style Stream Digest'),
        html: expect.stringContaining('Architectural Cashmere & Heavy Wool'),
        text: expect.stringContaining('Sharply tailored overcoats'),
      })
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('<msg-12345@atelier-edit.com>');
  });

  it('handles transporter failure gracefully without throwing exceptions', async () => {
    process.env.SMTP_HOST = 'smtp.sendgrid.net';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'apikey';
    process.env.SMTP_PASS = 'SG.test-key';

    const mockSendMail = jest.fn().mockRejectedValue(new Error('Connection timeout to SMTP gateway'));

    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail,
    });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const result = await sendWhatsNewEmailDigest({
      email: 'keith@sparky.com',
      posts: mockPosts,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Connection timeout to SMTP gateway');

    consoleErrorSpy.mockRestore();
  });
});
