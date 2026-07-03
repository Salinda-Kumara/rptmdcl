import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { LogsService } from './logs.service';

// Maps a request (method + route pattern) to a friendly action label, and marks
// which routes concern an application so the log can be filtered per-application.
function describe(method: string, routePath: string): { action: string; entity?: string } {
  const p = routePath || '';
  if (p.includes('/applications')) {
    if (method === 'POST' && /\/applications$/.test(p)) return { action: 'application.create', entity: 'application' };
    if (/\/submit$/.test(p)) return { action: 'application.submit', entity: 'application' };
    if (/\/exam-review$/.test(p)) return { action: 'application.exam_review', entity: 'application' };
    if (/\/payment-review$/.test(p)) return { action: 'application.payment_review', entity: 'application' };
    if (/\/rollback$/.test(p)) return { action: 'application.rollback', entity: 'application' };
    if (method === 'DELETE') return { action: 'application.cancel', entity: 'application' };
    return { action: `application.${method.toLowerCase()}`, entity: 'application' };
  }
  if (p.includes('/auth')) {
    if (/login/.test(p)) return { action: 'auth.login' };
    return { action: `auth.${method.toLowerCase()}` };
  }
  if (p.includes('/documents')) return { action: `document.${method.toLowerCase()}`, entity: 'document' };
  if (p.includes('/admin/users')) return { action: `user.${method.toLowerCase()}`, entity: 'user' };
  if (p.includes('/admin')) {
    const seg = p.split('/admin/')[1]?.split('/')[0] || 'admin';
    return { action: `admin.${seg}.${method.toLowerCase()}` };
  }
  if (p.includes('/students')) return { action: `student.${method.toLowerCase()}`, entity: 'student' };
  const base = p.split('/').filter(Boolean)[0] || 'request';
  return { action: `${base}.${method.toLowerCase()}` };
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logs: LogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') return next.handle();

    const req = context.switchToHttp().getRequest();
    const method: string = req.method;

    // Only record state-changing requests (skip reads to keep the trail useful).
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return next.handle();

    const routePath: string = req.route?.path ? `${req.baseUrl || ''}${req.route.path}` : req.originalUrl;
    const { action, entity } = describe(method, req.originalUrl || routePath);

    const ipAddress =
      (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || null;
    const userAgent = (req.headers?.['user-agent'] as string) || null;

    const write = (statusCode: number, success: boolean, message?: string, data?: any) => {
      const user = req.user; // populated by JwtAuthGuard when the route is protected
      // Application id for per-application filtering: prefer the route param, and
      // fall back to the id in the response body (e.g. on create).
      const entityId =
        req.params?.id ?? (entity === 'application' && data && typeof data === 'object' ? data.id ?? null : null);
      // Human-friendly reference — the application serial number, taken from the
      // action's response body (exam/finance/rollback/submit all return it).
      const entityRef =
        entity === 'application' && data && typeof data === 'object' ? data.serialNumber ?? null : null;
      // Never log request bodies (they may contain passwords) — only route params.
      const details = req.params && Object.keys(req.params).length ? { params: req.params } : undefined;

      this.logs.record({
        userId: user?.id ?? null,
        userEmail: user?.email ?? req.body?.email ?? null,
        userName: user?.staffUser?.name ?? null,
        action,
        method,
        route: req.originalUrl || routePath,
        entity: entity ?? null,
        entityId,
        entityRef,
        statusCode,
        success,
        message: message ?? null,
        details,
        ipAddress,
        userAgent,
      });
    };

    return next.handle().pipe(
      tap({
        next: (data) => write(context.switchToHttp().getResponse()?.statusCode ?? 200, true, undefined, data),
        error: (err) => write(err?.status ?? 500, false, err?.message ?? 'Error'),
      }),
    );
  }
}
