'use client';

import React from 'react';
import { StaffLoginForm } from '@/components/auth/StaffLoginForm';

export default function StaffLoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50 mb-2">ERMAS</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Examination Repeat & Medical Application Management System
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg dark:shadow-gray-900 border border-slate-200 dark:border-gray-800 p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-50 mb-6">Staff Login</h2>
          <StaffLoginForm />
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-600 mt-4">
          © 2026 School of Accounting and Business of CA Sri Lanka. All rights reserved.
        </p>
      </div>
    </div>
  );
}
