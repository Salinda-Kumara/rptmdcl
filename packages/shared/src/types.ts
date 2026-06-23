// User roles
export enum UserRole {
  STUDENT = 'STUDENT',
  FINANCE_OFFICER = 'FINANCE_OFFICER',
  SCHEDULE_OFFICER = 'SCHEDULE_OFFICER',
  VERIFICATION_OFFICER = 'VERIFICATION_OFFICER',
  EXAM_MANAGER = 'EXAM_MANAGER',
  REGISTRAR = 'REGISTRAR',
  DIRECTOR = 'DIRECTOR',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

// Permissions
export enum Permission {
  APPLICATION_CREATE = 'application.create',
  APPLICATION_APPROVE = 'application.approve',
  PAYMENT_VERIFY = 'payment.verify',
  SCHEDULE_CREATE = 'schedule.create',
  REPORT_VIEW = 'report.view',
  USER_MANAGE = 'user.manage',
}

// Application status
export enum ApplicationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAYMENT_VERIFIED = 'PAYMENT_VERIFIED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RETURNED = 'RETURNED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
}

// Application type
export enum ApplicationType {
  MEDICAL = 'MEDICAL',
  REPEAT = 'REPEAT',
}

export const APPLICATION_FEES = {
  MEDICAL: 5200, // LKR
  REPEAT: 2600, // LKR
};

// Workflow actions
export enum WorkflowAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  RETURN = 'RETURN',
  ADD_REMARK = 'ADD_REMARK',
}

// User types
export type StudentUser = {
  id: string;
  batchNumber: string;
  nic: string;
  fullName: string;
  email: string;
};

export type StaffUser = {
  id: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
};
