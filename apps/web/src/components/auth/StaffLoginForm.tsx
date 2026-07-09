'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/use-auth';
import { staffApi } from '@/lib/staff-api';
import { AuthField, AuthButton, authError } from './AuthScene';

export function StaffLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { staffLogin } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await staffLogin({ email, password });
      // Route master admins to the admin console, everyone else to the staff portal.
      let target = '/dashboard/staff';
      try {
        const profile = await staffApi.getProfile();
        if (profile?.isAdmin) target = '/dashboard/admin';
      } catch { /* fall back to staff portal */ }
      router.push(target);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AuthField
        icon={<Mail className="h-4 w-4" />}
        id="email"
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <AuthField
        icon={<Lock className="h-4 w-4" />}
        trailing={
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            title={showPassword ? 'Hide password' : 'Show password'}
            className="text-gray-400 transition-colors hover:text-purple-500"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
        id="password"
        type={showPassword ? 'text' : 'password'}
        placeholder="Enter your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      {error && <div className={authError}>{error}</div>}

      <AuthButton type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in…' : 'Login to Dashboard'}
      </AuthButton>
    </form>
  );
}
