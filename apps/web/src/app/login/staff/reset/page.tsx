'use client';

import React from 'react';
import { AuthScene } from '@/components/auth/AuthScene';
import { StaffPasswordResetForm } from '@/components/auth/StaffPasswordResetForm';

export default function StaffPasswordResetPage() {
  return (
    <AuthScene title="Reset Password" subtitle="Staff Portal account recovery">
      <StaffPasswordResetForm />
    </AuthScene>
  );
}
