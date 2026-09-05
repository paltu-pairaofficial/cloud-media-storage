import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Resend } from 'resend';
import { db, User } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'cloud-media-storage-jwt-secret-key-2026';
const AVATAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316'];

let resendClient: Resend | null = null;
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await db.getUserByEmail(normalizedEmail);
    if (existing) {
      res.status(409).json({ error: 'User with this email already exists' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const newUser: User = {
      id: 'usr_' + crypto.randomBytes(6).toString('hex'),
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      avatarColor: randomColor,
      createdAt: new Date().toISOString(),
    };

    await db.createUser(newUser);

    const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        avatarColor: newUser.avatarColor,
        createdAt: newUser.createdAt,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await db.getUserByEmail(normalizedEmail);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarColor: user.avatarColor,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
}

export async function me(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      avatarColor: req.user.avatarColor,
      createdAt: req.user.createdAt,
    },
  });
}

export async function updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const { name, avatarColor } = req.body;
  const user = await db.getUserById(req.user.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const updatedUser = await db.updateUser(user.id, {
    name: name ? name.trim() : undefined,
    avatarColor: avatarColor || undefined,
  });

  if (!updatedUser) {
    res.status(500).json({ error: 'Failed to update profile' });
    return;
  }

  res.json({
    user: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      avatarColor: updatedUser.avatarColor,
      createdAt: updatedUser.createdAt,
    },
  });
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email address is required' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await db.getUserByEmail(normalizedEmail);
    const successMsg = 'If an account exists for this email, a password reset link has been sent.';

    if (!user) {
      // Return same success message for security without revealing whether user exists
      res.json({ message: successMsg });
      return;
    }

    // Generate secure password reset JWT token valid for 1 hour
    const resetToken = jwt.sign(
      { id: user.id, email: user.email, type: 'password_reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const origin = req.get('origin');
    let resetLink: string;
    if (origin) {
      resetLink = `${origin}/?resetToken=${resetToken}`;
    } else {
      const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
      const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost:3000';
      resetLink = `${proto}://${host}/?resetToken=${resetToken}`;
    }

    console.log(`[AUTH] Password reset requested for ${user.email}.`);

    // Send reset link to user's registered email using Resend
    const resend = getResendClient();
    if (resend) {
      try {
        const fromAddress = process.env.RESEND_FROM_EMAIL || 'Cloud Media Storage <onboarding@resend.dev>';
        const emailResult = await resend.emails.send({
          from: fromAddress,
          to: [user.email],
          subject: 'Reset your Cloud Media Storage password',
          html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F5F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2D2D2A;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F5F5F0; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 24px; border: 1px solid #E5E5DF; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 36px 36px 24px 36px; text-align: left;">
              <div style="display: inline-block; padding: 8px 14px; background-color: #5A5A40; border-radius: 12px; margin-bottom: 24px;">
                <span style="color: #ffffff; font-size: 13px; font-weight: 700; letter-spacing: -0.2px;">Cloud Media Storage</span>
              </div>
              <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #2D2D2A; line-height: 1.3;">
                Password Reset Request
              </h1>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #71716A;">
                Hello${user.name ? ` ${user.name}` : ''},
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #71716A;">
                We received a request to reset the password for your Cloud Media Storage account. Click the button below to choose a new password:
              </p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${resetLink}" target="_blank" style="display: inline-block; background-color: #5A5A40; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 2px 6px rgba(90, 90, 64, 0.25);">
                  Reset Password
                </a>
              </div>
              <p style="margin: 24px 0 0 0; font-size: 12px; line-height: 1.6; color: #8E8E8A;">
                This link is valid for <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email — your password will remain unchanged.
              </p>
              <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #E5E5DF; word-break: break-all;">
                <p style="margin: 0 0 6px 0; font-size: 11px; color: #8E8E8A;">If the button above does not work, copy and paste this link into your browser:</p>
                <a href="${resetLink}" style="font-size: 11px; color: #5A5A40; text-decoration: underline;">${resetLink}</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #EFEFEA; padding: 16px 36px; text-align: center; border-top: 1px solid #E5E5DF;">
              <p style="margin: 0; font-size: 11px; color: #8E8E8A;">
                Cloud Media Storage &bull; Secure Enterprise Drive
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
          text: `Hello${user.name ? ` ${user.name}` : ''},\n\nWe received a request to reset your Cloud Media Storage password.\n\nClick the link below to set a new password:\n${resetLink}\n\nThis link is valid for 1 hour. If you did not request this, please ignore this email.`,
        });

        if (emailResult.error) {
          console.error('[AUTH] Resend email send error:', emailResult.error);
        } else {
          console.log('[AUTH] Password reset email sent via Resend. ID:', emailResult.data?.id);
        }
      } catch (sendError) {
        console.error('[AUTH] Resend email delivery failed:', sendError);
      }
    } else {
      console.warn('[AUTH] RESEND_API_KEY is not configured. Email not sent.');
    }

    res.json({
      message: successMsg,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error during password reset request' });
  }
}

export async function verifyResetToken(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ error: 'Reset token is required' });
      return;
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      res.status(400).json({ error: 'Invalid or expired password reset link' });
      return;
    }

    if (decoded.type !== 'password_reset' || !decoded.id) {
      res.status(400).json({ error: 'Invalid password reset token type' });
      return;
    }

    const user = await db.getUserById(decoded.id);
    if (!user) {
      res.status(404).json({ error: 'User associated with this reset link not found' });
      return;
    }

    res.json({
      valid: true,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({ error: 'Failed to verify reset token' });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      res.status(400).json({ error: 'Reset token and new password are required' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long' });
      return;
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      res.status(400).json({ error: 'Invalid or expired password reset link' });
      return;
    }

    if (decoded.type !== 'password_reset' || !decoded.id) {
      res.status(400).json({ error: 'Invalid password reset token' });
      return;
    }

    const user = await db.getUserById(decoded.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    const updatedUser = await db.updateUser(user.id, { passwordHash });
    if (!updatedUser) {
      res.status(500).json({ error: 'Failed to update password' });
      return;
    }

    res.json({
      message: 'Password has been reset successfully. You can now log in with your new password.',
      email: user.email,
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error during password reset' });
  }
}
