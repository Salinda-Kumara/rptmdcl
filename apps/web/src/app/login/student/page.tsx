'use client';

import React from 'react';
import { AuthScene } from '@/components/auth/AuthScene';
import { StudentLoginForm } from '@/components/auth/StudentLoginForm';

export default function StudentLoginPage() {
  return (
    <AuthScene title="Student Portal" subtitle="Repeat & Medical Exam Applications">
      <StudentLoginForm />
    </AuthScene>
  );
}
