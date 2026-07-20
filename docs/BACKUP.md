# Daily Backups to OneDrive + Telegram Notifications

This guide sets up an automated daily backup of ERMAS (both Postgres databases
— `ermas` and `ermas_logs` — plus uploaded files) to OneDrive, with a
Telegram message reporting success or failure after every run.

```
cron (2:00 AM daily)
  └─► backup.sh
        ├─► pg_dump ermas + ermas_logs  (via the ermas-postgres container)
        ├─► copy uploaded files          (via the ermas-api container)
        ├─► tar everything into one dated archive
        ├─► rclone copy → OneDrive
        ├─► prune old local archives
        └─► Telegram message: ✅ success (size, duration) or ❌ failure (log tail)
```

## Prerequisites

- The app already deployed per [DEPLOYMENT.md](DEPLOYMENT.md) (containers named
  `ermas-postgres`, `ermas-api`).
- Root or sudo access on the VPS.
- A Microsoft account with OneDrive (personal, or a work/school OneDrive for
  Business account).
- A Telegram account.

## 1. Install rclone

[rclone](https://rclone.org/) syncs to OneDrive from the command line.

```bash
sudo -v ; curl https://rclone.org/install.sh | sudo bash
```

## 2. Connect rclone to OneDrive

Run the interactive config once:

```bash
rclone config
```

Follow the prompts:

1. `n` (new remote)
2. Name: `onedrive`
3. Storage type: search/enter `onedrive`
4. Client ID / Secret: leave blank (press Enter) to use rclone's own
5. Edit advanced config: `n`
6. **Use auto config:**
   - If the VPS has a desktop browser reachable from your machine (rare), say `y`.
   - Otherwise say `n` — rclone prints a command to run **on your own laptop**
     (which must also have rclone installed: same install command as step 1).
     Run it there, log into Microsoft in the browser that opens and approve
     access, then paste the resulting config block back into the VPS prompt
     when asked.
7. **Choose your OneDrive type** — rclone lists what it found on the account:
   - `1` for OneDrive Personal (most setups)
   - Business/SharePoint accounts will instead see a list of matching
     sites/drives — pick the one that's your actual OneDrive.
8. It then shows the drive it resolved and asks **"Is that okay?"** → `y`.
9. Confirm: `y`, then `q` to quit.

Create the destination folder and verify access:

```bash
rclone mkdir onedrive:ERMAS-Backups
rclone lsd onedrive:
```

You should see `ERMAS-Backups` listed.

## 3. Create a Telegram bot for notifications

1. In Telegram, message **[@BotFather](https://t.me/BotFather)** → `/newbot` →
   follow the prompts → copy the **bot token** it gives you
   (looks like `123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`).
2. Message your new bot anything (e.g. "hi") so it can see your chat.
3. Get your **chat ID**:
   ```bash
   curl -s "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates"
   ```
   Find `"chat":{"id": 123456789, ...}` in the response — that number is your
   chat ID. (If it's empty, make sure you messaged the bot first, then retry.)
4. To notify a **group** instead, add the bot to the group, send a message
   there, and use the group's (negative) chat ID from the same call.

## 4. The backup script

Create `/opt/ermas-backup/backup.sh` (adjust `PROJECT_DIR` to where you cloned
the repo):

```bash
sudo mkdir -p /opt/ermas-backup
sudo nano /opt/ermas-backup/backup.sh
```

```bash
#!/usr/bin/env bash
# ERMAS daily backup → OneDrive, with a Telegram status notification.
set -uo pipefail

# ── Configuration ──────────────────────────────────────────────────────────
PROJECT_DIR="/root/ermas"                 # where docker-compose.deploy.yml lives
DB_CONTAINER="ermas-postgres"
API_CONTAINER="ermas-api"
PG_USER="ermas"                           # must match POSTGRES_USER in .env
BACKUP_DIR="/opt/ermas-backup/archives"   # local staging (also kept as a spare copy)
RETAIN_DAYS=7                             # local archives older than this are deleted
RCLONE_REMOTE="onedrive:ERMAS-Backups"

TELEGRAM_BOT_TOKEN="REPLACE_WITH_YOUR_BOT_TOKEN"
TELEGRAM_CHAT_ID="REPLACE_WITH_YOUR_CHAT_ID"
# ────────────────────────────────────────────────────────────────────────────

STAMP="$(date +%Y-%m-%d_%H-%M)"
WORK="$(mktemp -d)"
LOG="$WORK/backup.log"
ARCHIVE="ermas-backup-${STAMP}.tar.gz"
START_TS=$(date +%s)

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG"; }

notify() {
  local text="$1"
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d chat_id="${TELEGRAM_CHAT_ID}" \
    -d parse_mode="HTML" \
    --data-urlencode text="$text" >/dev/null
}

fail() {
  log "FAILED: $1"
  local tail_log
  tail_log=$(tail -n 25 "$LOG" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')
  notify "❌ <b>ERMAS backup failed</b>
$1

<pre>${tail_log}</pre>"
  rm -rf "$WORK"
  exit 1
}

mkdir -p "$BACKUP_DIR"

log "Starting backup ${STAMP}"

# 1. Dump both databases (custom format: compressed, selectively restorable).
log "Dumping database: ermas"
docker exec "$DB_CONTAINER" pg_dump -U "$PG_USER" -Fc ermas > "$WORK/ermas.dump" \
  2>>"$LOG" || fail "pg_dump ermas failed"

log "Dumping database: ermas_logs"
docker exec "$DB_CONTAINER" pg_dump -U "$PG_USER" -Fc ermas_logs > "$WORK/ermas_logs.dump" \
  2>>"$LOG" || fail "pg_dump ermas_logs failed"

# 2. Copy uploaded files (payment slips, medical certificates, etc.) straight
#    out of the API container — works regardless of the underlying volume name.
log "Copying uploaded files"
docker cp "${API_CONTAINER}:/app/apps/api/uploads" "$WORK/uploads" \
  2>>"$LOG" || fail "docker cp uploads failed"

# 3. Archive everything into one dated file.
log "Creating archive"
tar -czf "$BACKUP_DIR/$ARCHIVE" -C "$WORK" ermas.dump ermas_logs.dump uploads \
  2>>"$LOG" || fail "tar archive failed"

SIZE=$(du -h "$BACKUP_DIR/$ARCHIVE" | cut -f1)
log "Archive created: $ARCHIVE ($SIZE)"

# 4. Upload to OneDrive.
log "Uploading to $RCLONE_REMOTE"
rclone copy "$BACKUP_DIR/$ARCHIVE" "$RCLONE_REMOTE" --stats-one-line -v \
  >>"$LOG" 2>&1 || fail "rclone upload failed"

# 5. Prune local archives older than RETAIN_DAYS (OneDrive keeps the full history).
find "$BACKUP_DIR" -name 'ermas-backup-*.tar.gz' -mtime "+${RETAIN_DAYS}" -delete

DURATION=$(( $(date +%s) - START_TS ))
log "Done in ${DURATION}s"

notify "✅ <b>ERMAS backup complete</b>
File: <code>${ARCHIVE}</code>
Size: ${SIZE}
Duration: ${DURATION}s
Destination: ${RCLONE_REMOTE}"

rm -rf "$WORK"
```

Fill in `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, and confirm `PROJECT_DIR` /
`PG_USER` match your `.env`. Then make it executable:

```bash
sudo chmod +x /opt/ermas-backup/backup.sh
```

## 5. Test it manually

```bash
sudo /opt/ermas-backup/backup.sh
```

You should see log lines print, a new file appear at
`/opt/ermas-backup/archives/`, the same file in `rclone lsl onedrive:ERMAS-Backups`,
and a ✅ message land in Telegram within a minute or two. If something fails,
you'll get a ❌ message with the last lines of the log instead — fix that
before scheduling it.

## 6. Schedule it with cron

```bash
sudo crontab -e
```

Add (runs daily at 2:00 AM server time):

```cron
0 2 * * * /opt/ermas-backup/backup.sh
```

Check the server's timezone with `timedatectl` if you want a specific local
time; adjust the hour accordingly.

## 7. Restoring from a backup

```bash
# Pick a backup — either from OneDrive or the local archives folder.
rclone copy onedrive:ERMAS-Backups/ermas-backup-2026-07-20_02-00.tar.gz .
mkdir restore && tar -xzf ermas-backup-2026-07-20_02-00.tar.gz -C restore

# Restore both databases (stop the api container first to avoid writes mid-restore).
docker compose -f docker-compose.deploy.yml stop api
cat restore/ermas.dump | docker exec -i ermas-postgres pg_restore -U ermas -d ermas --clean --if-exists
cat restore/ermas_logs.dump | docker exec -i ermas-postgres pg_restore -U ermas -d ermas_logs --clean --if-exists

# Restore uploaded files
docker cp restore/uploads/. ermas-api:/app/apps/api/uploads/

docker compose -f docker-compose.deploy.yml start api
```

## Troubleshooting

- **`rclone: command not found` in cron** — cron uses a minimal `PATH`; the
  script above calls `rclone` directly, which works as long as it installed to
  `/usr/bin/rclone` (the default). If you installed it elsewhere, use rclone's
  full path in the script.
- **No Telegram message arrives** — re-check the bot token and chat ID; test
  with a bare `curl` call to `sendMessage` outside the script. Make sure you
  messaged the bot at least once before calling `getUpdates`.
- **`rclone` prompts for browser auth again** — the OAuth token in
  `~/.config/rclone/rclone.conf` expired or was never completed; re-run
  `rclone config reconnect onedrive:`.
- **OneDrive token expires after long inactivity** — Microsoft refresh tokens
  can lapse if the remote goes unused for an extended period (~90 days on some
  tenants); since this runs daily that shouldn't happen, but if it does,
  `rclone config reconnect onedrive:` fixes it the same way.
- **Archive is huge / upload is slow** — the `uploads/` folder (medical
  certificates, payment slips) grows over time; this is expected. rclone
  resumes on failure, so a slow link just means a longer nightly window, not a
  failed backup — check the log if it times out inside a shorter cron window.
