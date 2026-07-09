'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, CreditCard, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/use-auth';
import apiClient from '@/lib/api-client';
import { AuthField, AuthButton, authError } from './AuthScene';

export function StudentLoginForm() {
  const [batchNumber, setBatchNumber] = useState('');
  const [nic, setNic] = useState('');
  const [showNic, setShowNic] = useState(false);
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <AuthField
        icon={<Users className="h-4 w-4" />}
        trailing={<ChevronDown className="h-4 w-4" />}
        id="batch"
        type="text"
        placeholder="Type to search batch..."
        value={batchNumber}
        onChange={(e) => setBatchNumber(e.target.value)}
        required
        list="batch-list"
        autoComplete="off"
      />
      <datalist id="batch-list">
        {batches.map((batch) => (
          <option key={batch} value={batch} />
        ))}
      </datalist>

      <AuthField
        icon={<CreditCard className="h-4 w-4" />}
        trailing={
          <button
            type="button"
            onClick={() => setShowNic((s) => !s)}
            title={showNic ? 'Hide NIC' : 'Show NIC'}
            className="text-gray-400 transition-colors hover:text-purple-500"
          >
            {showNic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
        id="nic"
        type={showNic ? 'text' : 'password'}
        placeholder="Enter Your NIC Number"
        value={nic}
        onChange={(e) => setNic(e.target.value)}
        required
      />

      {error && <div className={authError}>{error}</div>}

      <AuthButton type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in…' : 'Login'}
      </AuthButton>
    </form>
  );
}
