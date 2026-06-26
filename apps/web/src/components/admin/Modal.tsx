'use client';

import React from 'react';
import { X } from 'lucide-react';

export function Modal({
  open, onClose, title, children, footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-xl dark:shadow-black/50 border border-slate-200 dark:border-gray-700">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-gray-100">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-600 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 text-slate-700 dark:text-gray-300">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-900/80 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Field({
  label, value, onChange, type = 'text', placeholder, required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-gray-400">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-900 dark:text-gray-100 px-3 py-2 text-sm placeholder:text-slate-400 dark:placeholder:text-gray-600 focus:border-amber-400 dark:focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-900/30"
      />
    </div>
  );
}
