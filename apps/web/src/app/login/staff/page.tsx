'use client';

import React from 'react';
import { AuthScene } from '@/components/auth/AuthScene';
import { StaffLoginForm } from '@/components/auth/StaffLoginForm';

export default function StaffLoginPage() {
  return (
    <AuthScene title="Staff Portal" subtitle="Manage repeat & medical exam applications">
      <StaffLoginForm />
    </AuthScene>
  );
}
