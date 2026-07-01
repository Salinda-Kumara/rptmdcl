'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { ProtectedLayout } from '@/components/auth/ProtectedLayout';
import { ApplicationDetailPanel } from '@/components/staff/panels/ApplicationDetailPanel';

export default function StaffApplicationDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const back = () => {
    // Opened in a new tab from the report → close it; otherwise go back.
    if (window.history.length > 1) window.history.back();
    else window.close();
  };

  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
        <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:py-8">
          {id ? <ApplicationDetailPanel id={id} onBack={back} /> : null}
        </div>
      </div>
    </ProtectedLayout>
  );
}
