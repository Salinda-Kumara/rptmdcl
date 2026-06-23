export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

export const DOCUMENT_TYPES = [
  'PAYMENT_SLIP',
  'MEDICAL_CERTIFICATE',
  'SUPPORTING_DOCUMENT',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

// Attachments may only be added/removed while the application is still with
// the student. Once SUBMITTED (or beyond) it is locked; RETURNED means the
// workflow sent it back to the student for correction.
export const EDITABLE_STATUSES = ['DRAFT', 'RETURNED'];
