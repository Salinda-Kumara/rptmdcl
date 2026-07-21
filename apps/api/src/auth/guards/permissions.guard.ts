import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY, RequiredPermission } from '../decorators/require-permission.decorator';
import { effectivePermissions, levelSatisfies } from '../permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RequiredPermission[]>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true; // no permission required

    const user = context.switchToHttp().getRequest().user;
    if (!user) throw new ForbiddenException('User not authenticated');
    if (user.isAdmin) return true; // Master Admin bypass

    const perms = effectivePermissions(user);
    const satisfiesAny = required.some((r) => levelSatisfies(perms[r.resource], r.level));
    if (!satisfiesAny) {
      throw new ForbiddenException(
        `Requires ${required.map((r) => `${r.level} access to ${r.resource}`).join(' or ')}`,
      );
    }
    return true;
  }
}
