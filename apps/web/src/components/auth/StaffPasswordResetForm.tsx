'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, KeyRound, Lock, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react';
import { staffApi } from '@/lib/staff-api';
import { AuthField, AuthButton, AuthError } from './AuthScene';

type Step = 'email' | 'otp' | 'password' | 'done';

export function StaffPasswordResetForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await staffApi.forgotPassword(email.trim());
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { resetToken: token } = await staffApi.verifyResetOtp(email.trim(), otp.trim());
      setResetToken(token);
      setStep('password');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  const submitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await staffApi.resetPassword(resetToken, newPassword);
      setStep('done');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not reset the password. Please start again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
          <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Your password has been updated.
        </p>
        <AuthButton type="button" onClick={() => router.push('/login/staff')}>
          Back to Sign In
        </AuthButton>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {step === 'email' && (
        <form onSubmit={submitEmail} className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enter your staff account email and we&apos;ll send you a 6-digit reset code.
          </p>
          <AuthField
            icon={<Mail className="h-4 w-4" />}
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error && <AuthError>{error}</AuthError>}
          <AuthButton type="submit" loading={loading} loadingLabel="Sending code...">
            Send Reset Code
          </AuthButton>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={submitOtp} className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            We sent a 6-digit code to <span className="font-medium text-gray-700 dark:text-gray-200">{email}</span>.
            It expires in 10 minutes.
          </p>
          <AuthField
            icon={<KeyRound className="h-4 w-4" />}
            id="otp"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
          />
          {error && <AuthError>{error}</AuthError>}
          <AuthButton type="submit" loading={loading} loadingLabel="Verifying...">
            Verify Code
          </AuthButton>
          <button
            type="button"
            onClick={() => { setStep('email'); setOtp(''); setError(''); }}
            className="w-full text-center text-xs font-medium text-gray-400 transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            Use a different email / resend code
          </button>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={submitNewPassword} className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Choose a new password for your account.</p>
          <AuthField
            icon={<Lock className="h-4 w-4" />}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                title={showPassword ? 'Hide password' : 'Show password'}
                className="text-gray-400 transition-colors hover:text-emerald-500"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            id="newPassword"
            type={showPassword ? 'text' : 'password'}
            placeholder="New password (min 8 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <AuthField
            icon={<Lock className="h-4 w-4" />}
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {error && <AuthError>{error}</AuthError>}
          <AuthButton type="submit" loading={loading} loadingLabel="Updating...">
            Set New Password
          </AuthButton>
        </form>
      )}

      <Link
        href="/login/staff"
        className="flex items-center justify-center gap-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
      </Link>
    </div>
  );
}
