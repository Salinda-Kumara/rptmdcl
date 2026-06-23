'use client';

import React from 'react';
import { StudentLoginForm } from '@/components/auth/StudentLoginForm';

export default function StudentLoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ERMAS</h1>
          <p className="text-gray-600">
            Examination Repeat & Medical Application Management System
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Student Login</h2>
          <StudentLoginForm />
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          © 2024 School of Accounting and Business. All rights reserved.
        </p>
      </div>
    </div>
  );
}
