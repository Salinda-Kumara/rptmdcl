import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter {
    if (this.transporter) return this.transporter;

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      throw new InternalServerErrorException(
        'Email sending is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing)',
      );
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for 587 (STARTTLS)
      auth: { user, pass },
    });
    return this.transporter;
  }

  async sendPasswordResetOtp(to: string, code: string, name?: string) {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const greeting = name ? `Hi ${name},` : 'Hi,';

    try {
      await this.getTransporter().sendMail({
        from,
        to,
        subject: 'Your ERMAS password reset code',
        text: `${greeting}\n\nYour password reset code is ${code}. It expires in 10 minutes.\n\nIf you didn't request this, you can safely ignore this email.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
            <p>${greeting}</p>
            <p>Your ERMAS password reset code is:</p>
            <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #059669; margin: 16px 0;">${code}</p>
            <p style="color: #64748b; font-size: 13px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });
    } catch (e) {
      this.logger.error(`Failed to send password reset OTP to ${to}`, e as Error);
      throw new InternalServerErrorException('Could not send the reset code email. Please try again shortly.');
    }
  }
}
