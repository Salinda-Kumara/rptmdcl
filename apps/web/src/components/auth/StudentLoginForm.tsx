'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/use-auth';
import apiClient from '@/lib/api-client';

export function StudentLoginForm() {
  const [batchNumber, setBatchNumber] = useState('');
  const [nic, setNic] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [batches, setBatches] = useState<string[]>([]);

  useEffect(() => {
    apiClient.get<string[]>('/auth/batches')
      .then(res => setBatches(res.data))
      .catch(err => console.error('Failed to load batches:', err));
  }, []);

  const { studentLogin } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await studentLogin({ batchNumber, nic });
      router.push('/dashboard/student');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="batch" className="block text-sm font-medium text-gray-700">
            Batch Number
          </label>
          <input
            id="batch"
            type="text"
            placeholder="e.g., AA22-105"
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
            required
            list="batch-list"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none"
          />
          <datalist id="batch-list">
            {batches.map((batch) => (
              <option key={batch} value={batch} />
            ))}
          </datalist>
        </div>

        <div>
          <label htmlFor="nic" className="block text-sm font-medium text-gray-700">
            NIC Number
          </label>
          <input
            id="nic"
            type="text"
            placeholder="e.g., 200012345678"
            value={nic}
            onChange={(e) => setNic(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none"
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div className="text-center text-sm text-gray-600">
        Are you a staff member?{' '}
        <Link href="/login/staff" className="text-primary-600 hover:underline">
          Staff Login
        </Link>
      </div>
    </div>
  );
}
