import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { LogsService } from './logs.service';

// Fallback verb when a route has no specific action mapping — turns the HTTP
// method into a plain word so the log never surfaces "post/patch/delete".
function verb(method: string): string {
  switch (method) {
    case 'POST': return 'create';
    case 'PUT':
    case 'PATCH': return 'update';
    case 'DELETE': return 'delete';
    default: return method.toLowerCase();
  }
}

// Plural admin route segment → singular entity used in the action code.
const ADMIN_ENTITY: Record<string, string> = {
  users: 'user', programmes: 'programme', subjects: 'subject', batches: 'batch',
  'exam-schedules': 'schedule', 'scheduled-exams': 'scheduled_exam',
  'exam-staff': 'exam_staff', 'exam-locations': 'exam_location', students: 'student',
};

// Maps a request (method + route) to a stable, human-meaningful action code and
// the entity it concerns. Codes are `resource.verb`; the frontend turns them into
// readable labels. `entity: 'application'` also enables per-application filtering.
function describe(method: string, routePath: string): { action: string; entity?: string } {
  const p = routePath || '';

  // ── Application documents live under /applications/:id/documents ──
  if (/\/applications\/[^/]+\/documents$/.test(p) && method === 'POST') {
    return { action: 'document.upload', entity: 'document' };
  }

  // ── Applications ──
  if (p.includes('/applications')) {
    const e = 'application';
    if (method === 'POST' && /\/applications$/.test(p)) return { action: 'application.create', entity: e };
    if (/\/submit$/.test(p)) return { action: 'application.submit', entity: e };
    if (/\/resubmit$/.test(p)) return { action: 'application.resubmit', entity: e };
    if (/\/exam-review$/.test(p)) return { action: 'application.exam_review', entity: e };
    if (/\/subjects\/[^/]+\/decline$/.test(p)) return { action: 'application.subject_decline', entity: e };
    if (/\/payment-review$/.test(p)) return { action: 'application.payment_review', entity: e };
    if (/\/final-approve\/bulk$/.test(p)) return { action: 'application.final_approve_bulk', entity: e };
    if (/\/final-approve$/.test(p)) return { action: 'application.final_approve', entity: e };
    if (/\/final-reject$/.test(p)) return { action: 'application.final_reject', entity: e };
    if (/\/rollback$/.test(p)) return { action: 'application.rollback', entity: e };
    if (/\/printed$/.test(p)) return { action: 'application.admission_printed', entity: e };
    if (method === 'DELETE') return { action: 'application.cancel', entity: e };
    return { action: `application.${verb(method)}`, entity: e };
  }

  // ── Documents (delete/download by id) ──
  if (p.includes('/documents')) {
    if (method === 'DELETE') return { action: 'document.delete', entity: 'document' };
    return { action: `document.${verb(method)}`, entity: 'document' };
  }

  // ── Auth ──
  if (p.includes('/auth')) {
    if (/login/.test(p)) return { action: 'auth.login' };
    if (/forgot-password/.test(p)) return { action: 'auth.password_reset_request' };
    if (/verify-reset-otp/.test(p)) return { action: 'auth.password_reset_verify' };
    if (/reset-password/.test(p)) return { action: 'auth.password_reset' };
    if (/refresh/.test(p)) return { action: 'auth.refresh' };
    return { action: `auth.${verb(method)}` };
  }

  // ── Admin resources ──
  if (p.includes('/admin/')) {
    const seg = p.split('/admin/')[1]?.split(/[/?]/)[0] || 'admin';
    const e = ADMIN_ENTITY[seg] ?? seg.replace(/-/g, '_');
    if (seg === 'exam-schedules') {
      if (/\/publish$/.test(p)) return { action: 'schedule.publish', entity: 'schedule' };
      if (/\/unpublish$/.test(p)) return { action: 'schedule.unpublish', entity: 'schedule' };
      if (/\/apply-enabled$/.test(p)) return { action: 'schedule.apply_toggle', entity: 'schedule' };
      if (/\/import$/.test(p)) return { action: 'schedule.import', entity: 'schedule' };
      if (/\/exams$/.test(p) && method === 'POST') return { action: 'scheduled_exam.create', entity: 'scheduled_exam' };
    }
    if (seg === 'students' && /\/import$/.test(p)) return { action: 'student.import', entity: 'student' };
    if (seg === 'users' && /\/activate$/.test(p)) return { action: 'user.activate', entity: 'user' };
    return { action: `${e}.${verb(method)}`, entity: e };
  }

  // ── Student self-service (profile/contact) ──
  if (p.includes('/students')) return { action: `student_profile.${verb(method)}`, entity: 'student' };

  const base = p.split('/').filter(Boolean)[0] || 'request';
  return { action: `${base}.${verb(method)}` };
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

    // Token refresh isn't a user action — it fires silently and repeatedly in
    // the background with no authenticated actor yet, so it only ever shows
    // up as noisy "System" entries. Skip logging it entirely.
    if (action === 'auth.refresh') return next.handle();

    const ipAddress =
      (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || null;
    const userAgent = (req.headers?.['user-agent'] as string) || null;

    const write = (statusCode: number, success: boolean, message?: string, data?: any) => {
      const user = req.user; // populated by JwtAuthGuard when the route is protected
      // On login the actor isn't authenticated yet — the identity comes back in
      // the response body ({ user: { name, email } }).
      const loginUser =
        action === 'auth.login' && data && typeof data === 'object' ? (data as any).user : null;
      // Actor name: staff name, else student full name, else the login response.
      const userName =
        user?.staffUser?.name ?? user?.student?.fullName ?? loginUser?.name ?? null;
      const userEmail = user?.email ?? loginUser?.email ?? req.body?.email ?? null;
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
        userEmail,
        userName,
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
