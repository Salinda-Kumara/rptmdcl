import { SetMetadata } from '@nestjs/common';
import { AccessLevel } from '../permissions';

export const PERMISSION_KEY = 'requiredPermission';

export interface RequiredPermission {
  resource: string;
  level: AccessLevel;
}

/**
 * Require the current user to hold at least `level` on `resource` (admins bypass).
 * Pass a list of {resource, level} pairs instead to require ANY one of them —
 * e.g. a reference-data endpoint that several unrelated features read from.
 */
export const RequirePermission = (
  resourceOrAlternatives: string | RequiredPermission[],
  level?: AccessLevel,
) => {
  const required: RequiredPermission[] =
    typeof resourceOrAlternatives === 'string'
      ? [{ resource: resourceOrAlternatives, level: level! }]
      : resourceOrAlternatives;
  return SetMetadata(PERMISSION_KEY, required);
};
