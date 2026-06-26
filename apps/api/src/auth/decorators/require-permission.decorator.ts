import { SetMetadata } from '@nestjs/common';
import { AccessLevel } from '../permissions';

export const PERMISSION_KEY = 'requiredPermission';

export interface RequiredPermission {
  resource: string;
  level: AccessLevel;
}

/** Require the current user to hold at least `level` on `resource` (admins bypass). */
export const RequirePermission = (resource: string, level: AccessLevel) =>
  SetMetadata(PERMISSION_KEY, { resource, level } as RequiredPermission);
