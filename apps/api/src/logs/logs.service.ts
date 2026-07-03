import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Pool } from 'pg';

// A single audit-log record. `entityId` is the application id where relevant,
// so the Admin Logs view can filter the trail down to one application.
export interface ActionLogInput {
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  action: string;
  method: string;
  route: string;
  entity?: string | null;
  entityId?: string | null;
  // Human-friendly reference for the entity — the application serial number.
  entityRef?: string | null;
  statusCode?: number | null;
  success: boolean;
  message?: string | null;
  details?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface LogQuery {
  entityId?: string;
  serial?: string;
  userId?: string;
  action?: string;
  method?: string;
  success?: boolean;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Writes and reads audit logs to a SEPARATE Postgres database (LOGS_DATABASE_URL)
 * so the operational trail is isolated from the application data. The table is
 * created automatically on start-up — you only need to create the empty database.
 */
@Injectable()
export class LogsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LogsService.name);
  private pool: Pool | null = null;
  private ready = false;

  async onModuleInit() {
    const connectionString = process.env.LOGS_DATABASE_URL;
    if (!connectionString) {
      this.logger.warn('LOGS_DATABASE_URL is not set — action logging is disabled.');
      return;
    }
    try {
      this.pool = new Pool({ connectionString, max: 5 });
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS action_logs (
          id          TEXT PRIMARY KEY,
          created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
          user_id     TEXT,
          user_email  TEXT,
          user_name   TEXT,
          action      TEXT NOT NULL,
          method      TEXT NOT NULL,
          route       TEXT NOT NULL,
          entity      TEXT,
          entity_id   TEXT,
          entity_ref  TEXT,
          status_code INTEGER,
          success     BOOLEAN NOT NULL DEFAULT true,
          message     TEXT,
          details     JSONB,
          ip_address  TEXT,
          user_agent  TEXT
        );
      `);
      // Idempotent upgrade for tables created before entity_ref existed.
      await this.pool.query('ALTER TABLE action_logs ADD COLUMN IF NOT EXISTS entity_ref TEXT;');
      await this.pool.query('CREATE INDEX IF NOT EXISTS action_logs_entity_id_idx ON action_logs (entity_id);');
      await this.pool.query('CREATE INDEX IF NOT EXISTS action_logs_entity_ref_idx ON action_logs (entity_ref);');
      await this.pool.query('CREATE INDEX IF NOT EXISTS action_logs_user_id_idx ON action_logs (user_id);');
      await this.pool.query('CREATE INDEX IF NOT EXISTS action_logs_created_at_idx ON action_logs (created_at);');
      await this.pool.query('CREATE INDEX IF NOT EXISTS action_logs_action_idx ON action_logs (action);');
      this.ready = true;
      this.logger.log('Connected to logs database and ensured action_logs table.');
    } catch (e: any) {
      this.ready = false;
      this.logger.error(`Could not initialise logs database: ${e?.message ?? e}`);
    }
  }

  async onModuleDestroy() {
    await this.pool?.end().catch(() => undefined);
  }

  /** Fire-and-forget insert. Never throws — logging must not break a request. */
  record(input: ActionLogInput): void {
    if (!this.pool || !this.ready) return;
    const details =
      input.details == null ? null : typeof input.details === 'string' ? input.details : JSON.stringify(input.details);
    this.pool
      .query(
        `INSERT INTO action_logs
          (id, user_id, user_email, user_name, action, method, route, entity, entity_id, entity_ref, status_code, success, message, details, ip_address, user_agent)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [
          randomUUID(),
          input.userId ?? null,
          input.userEmail ?? null,
          input.userName ?? null,
          input.action,
          input.method,
          input.route,
          input.entity ?? null,
          input.entityId ?? null,
          input.entityRef ?? null,
          input.statusCode ?? null,
          input.success,
          input.message ?? null,
          details,
          input.ipAddress ?? null,
          input.userAgent ?? null,
        ],
      )
      .catch((e) => this.logger.error(`Failed to write action log: ${e?.message ?? e}`));
  }

  /** Paged, filterable list for the Admin Logs view. */
  async list(q: LogQuery): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, q.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, q.pageSize ?? 50));
    if (!this.pool || !this.ready) {
      return { items: [], total: 0, page, pageSize };
    }

    const where: string[] = [];
    const params: any[] = [];
    const add = (clause: string, value: any) => { params.push(value); where.push(clause.replace('?', `$${params.length}`)); };

    if (q.entityId) add('entity_id = ?', q.entityId);
    if (q.serial) add('entity_ref ILIKE ?', `%${q.serial}%`);
    if (q.userId) add('user_id = ?', q.userId);
    if (q.action) add('action = ?', q.action);
    if (q.method) add('method = ?', q.method.toUpperCase());
    if (typeof q.success === 'boolean') add('success = ?', q.success);
    if (q.dateFrom) add('created_at >= ?', new Date(q.dateFrom));
    if (q.dateTo) { const to = new Date(q.dateTo); to.setHours(23, 59, 59, 999); add('created_at <= ?', to); }
    if (q.search) {
      const like = `%${q.search}%`;
      params.push(like);
      const p = `$${params.length}`;
      where.push(`(user_email ILIKE ${p} OR user_name ILIKE ${p} OR route ILIKE ${p} OR action ILIKE ${p} OR message ILIKE ${p} OR entity_id ILIKE ${p} OR entity_ref ILIKE ${p})`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const totalRes = await this.pool.query(`SELECT COUNT(*)::int AS count FROM action_logs ${whereSql}`, params);
    const total = totalRes.rows[0]?.count ?? 0;

    const offset = (page - 1) * pageSize;
    const rows = await this.pool.query(
      `SELECT * FROM action_logs ${whereSql} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return { items: rows.rows, total, page, pageSize };
  }

  /** Distinct action names — used to populate the filter dropdown. */
  async actions(): Promise<string[]> {
    if (!this.pool || !this.ready) return [];
    const res = await this.pool.query('SELECT DISTINCT action FROM action_logs ORDER BY action ASC');
    return res.rows.map((r) => r.action);
  }
}
