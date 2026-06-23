'use client';

import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">ERMAS</h1>
          <div className="space-x-4">
            <Link href="/student" className="text-primary-600 hover:text-primary-700">
              Student Login
            </Link>
            <Link
              href="/login/staff"
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              Staff Login
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            Examination Repeat & Medical Application Management System
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Streamline your examination repeat and medical applications with our modern, secure,
            and easy-to-use platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Link
            href="/student"
            className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition"
          >
            <div className="text-4xl mb-4">🎓</div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">Student Portal</h3>
            <p className="text-gray-600 mb-4">
              Submit your examination repeat or medical applications online
            </p>
            <span className="text-primary-600 font-semibold">Login as Student →</span>
          </Link>

          <Link
            href="/login/staff"
            className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition"
          >
            <div className="text-4xl mb-4">👨‍💼</div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">Staff Portal</h3>
            <p className="text-gray-600 mb-4">
              Manage and approve applications, verify payments, and generate reports
            </p>
            <span className="text-primary-600 font-semibold">Login as Staff →</span>
          </Link>
        </div>

        <div className="mt-16 bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start">
              <span className="text-2xl mr-3">✓</span>
              <div>
                <h4 className="font-semibold text-gray-900">Easy Application Process</h4>
                <p className="text-gray-600 text-sm">Submit applications online with supporting documents</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-2xl mr-3">✓</span>
              <div>
                <h4 className="font-semibold text-gray-900">Real-time Tracking</h4>
                <p className="text-gray-600 text-sm">Track your application status at every step</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-2xl mr-3">✓</span>
              <div>
                <h4 className="font-semibold text-gray-900">Secure Payment Verification</h4>
                <p className="text-gray-600 text-sm">Safe and secure payment verification process</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-2xl mr-3">✓</span>
              <div>
                <h4 className="font-semibold text-gray-900">Multi-level Approval Workflow</h4>
                <p className="text-gray-600 text-sm">Comprehensive approval process with remarks</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-gray-600">
          <p>© 2024 School of Accounting and Business. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
