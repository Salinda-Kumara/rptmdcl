-- Runs on first container start only: the audit trail lives in its own
-- database (LOGS_DATABASE_URL), separate from the application data.
CREATE DATABASE ermas_logs;
