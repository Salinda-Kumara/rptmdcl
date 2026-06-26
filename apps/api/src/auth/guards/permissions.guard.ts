import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY, RequiredPermission } from '../decorators/require-permission.decorator';
import { effectivePermissions, levelSatisfies } from '../permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RequiredPermission>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true; // no permission required

    const user = context.switchToHttp().getRequest().user;
    if (!user) throw new ForbiddenException('User not authenticated');
    if (user.isAdmin) return true; // Master Admin bypass

    const have = effectivePermissions(user)[required.resource];
    if (!levelSatisfies(have, required.level)) {
      throw new ForbiddenException(
        `Requires ${required.level} access to ${required.resource}`,
      );
    }
    return true;
  }
}
