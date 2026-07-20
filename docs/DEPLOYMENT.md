# ERMAS Deployment Guide

This guide covers the self-contained deployment of the ERMAS application (Postgres + API + Web) on a server (e.g., Ubuntu) using Docker Compose.

## Prerequisites

- Git
- Docker and Docker Compose plugin (`docker-compose-v2`)

## Step-by-Step Deployment

### 1. Clone the Repository

On your server, clone the repository and navigate into the project directory:

```bash
git clone <your-repository-url> ermas
cd ermas
```

### 2. Configure Environment Variables

Copy the provided deployment template to create your `.env` file:

```bash
cp .env.deploy.example .env
```

Edit the `.env` file using a text editor like `nano`:

```bash
nano .env
```

**Important changes to make:**
- `HOST_ADDR`: Change this to the IP address of your server on the local network (e.g., `192.168.1.50`). This is the IP that users will type into their browsers to access the application.
- `POSTGRES_PASSWORD`: Set a secure password containing **only alphanumeric characters** (letters and numbers). Avoid special characters like `@`, `/`, or `?` as they can break the database connection string.
- `JWT_SECRET` & `JWT_REFRESH_SECRET`: Generate and paste strong random strings here (e.g., using `openssl rand -base64 48`).
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM`: Needed for the staff
  "Forgot password" OTP emails. Any SMTP provider works — e.g.
  [Brevo](https://www.brevo.com)'s free tier (SMTP & API settings → generate an SMTP key). Without these set,
  staff password reset will fail with a 500 when requesting a code; the rest of the app is unaffected.

### 3. Build and Start the Application

Start the Docker containers in detached mode. This step will pull necessary base images and build the API and Web services.

```bash
docker compose -f docker-compose.deploy.yml up -d --build
```

### 4. Initialize the Database (First-Time Only)

On a **fresh** volume, two things happen automatically the moment the containers
start — you don't need to trigger them yourself:

- Postgres runs [`docker/initdb/01-create-logs-db.sql`](../docker/initdb/01-create-logs-db.sql),
  which creates the separate `ermas_logs` database.
- The `api` container's own startup command
  ([`docker/Dockerfile.api`](../docker/Dockerfile.api)) runs
  `prisma db push` and only starts the server once that succeeds.

So all that's left after step 3 is to wait for the API to finish starting, then seed:

```bash
# Wait for the schema push + server startup to finish.
until docker compose -f docker-compose.deploy.yml logs api 2>&1 | grep -q "Server is running"; do sleep 2; done

# Seed programmes, subjects and the exam-staff directory
docker compose -f docker-compose.deploy.yml exec api node dist/prisma/seed.js
```

> **Note:** Students and batches are **not** seeded — import them from Excel via the
> admin **Students** screen.
>
> If you're restoring onto an **existing** (non-fresh) Postgres volume, the
> initdb script won't re-run, so `ermas_logs` may not exist yet — in that case
> the app still runs fine (the Activity Logs feature is simply disabled, with a
> warning in the API logs) until you create it manually and restart:
> ```bash
> docker compose -f docker-compose.deploy.yml exec postgres psql -U ermas -c "CREATE DATABASE ermas_logs;"
> docker compose -f docker-compose.deploy.yml restart api
> ```

### 4b. Deploying Updates (pulling new code)

To roll out a new version after the initial setup:

```bash
cd ermas
git pull

# Rebuild and restart the containers with the new code — the api container
# applies any schema changes (new columns/tables) automatically on startup,
# via the `prisma db push` baked into its Dockerfile CMD.
docker compose -f docker-compose.deploy.yml up -d --build

# (Optional) re-run the seed to add any new programmes/subjects/exam staff.
# It is idempotent, BUT it resets the four staff-account passwords to the seed
# default — re-set them afterwards if you have changed them in production.
docker compose -f docker-compose.deploy.yml exec api node dist/prisma/seed.js
```

> **Don't** run `docker compose exec api npx prisma db push` manually right
> after `up -d --build` — the container is already running that exact command
> on its own as part of starting up, and a second push racing the first one
> can throw a harmless-but-alarming `relation "..." already exists` error. If
> you want to review a schema diff before deploying, run `prisma db push` from
> your own machine against a copy of the DB instead, or just trust the
> automatic one and check `docker compose logs api` afterward.
>
> If the automatic push ever needs to accept a lossy change (e.g. narrowing a
> column), it already runs with `--accept-data-loss` baked in — review such
> changes carefully before merging them, since the container won't ask for
> confirmation in production.

### 5. Access the Application

The application is now live! Open a web browser on any machine in the network and navigate to:

- **Web Portal:** `http://<HOST_ADDR>:3000`
- **API Base URL:** `http://<HOST_ADDR>:3001/api/v1`

## 6. Public Access: Domain + HTTPS via Cloudflare Tunnel

The steps above expose the app on a LAN IP over plain HTTP. To publish it on a
real domain with HTTPS — **without opening any inbound ports or needing a public
static IP** — put an nginx reverse proxy in front of the containers and connect
it to Cloudflare with a Tunnel.

```
Browser ──HTTPS──► Cloudflare edge ──Tunnel(outbound)──► cloudflared ──► nginx ──► web:3000
                    (your domain)                                          └──► api:3001  (/api)
```

Two files in the repo make this a drop-in overlay on the deployment stack:

- [`docker/nginx.conf`](../docker/nginx.conf) — serves the web app at `/` and
  proxies `/api` to the API, so everything is **one origin** (no CORS, no second
  hostname).
- [`docker-compose.public.yml`](../docker-compose.public.yml) — adds the `nginx`
  and `cloudflared` services and points the web/API at the domain.

### Prerequisites

- A domain added to your Cloudflare account (its nameservers point to Cloudflare).
- A free [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) account.

### 6.1 Create the Tunnel in Cloudflare

1. In the Zero Trust dashboard, go to **Networks → Tunnels → Create a tunnel**.
2. Choose **Cloudflared**, name it (e.g. `ermas`), and **Save**.
3. On the "Install connector" screen, copy the **tunnel token** (the long string
   after `--token`). You do **not** need to run the install command shown — the
   `cloudflared` container uses this token.
4. Open the tunnel's **Public Hostname** tab and **Add a public hostname**:
   - **Subdomain/Domain:** the address users will visit, e.g. `ermas.example.com`
   - **Service Type:** `HTTP`
   - **URL:** `nginx:80`  (the tunnel runs on the same Docker network as nginx)

   Cloudflare creates the DNS record automatically.

### 6.2 Configure `.env`

Add the domain and tunnel token to your existing `.env`:

```bash
PUBLIC_DOMAIN=ermas.example.com
CF_TUNNEL_TOKEN=<the tunnel token you copied>
```

### 6.3 Build and start with the overlay

Because `NEXT_PUBLIC_API_URL` is baked into the web bundle at build time, the web
image must be **rebuilt** when switching to the domain:

```bash
docker compose -f docker-compose.deploy.yml -f docker-compose.public.yml up -d --build
```

Run every later command with **both** `-f` files so the overlay stays applied,
e.g. deploying updates:

```bash
docker compose -f docker-compose.deploy.yml -f docker-compose.public.yml up -d --build
```

### 6.4 Verify

- Visit `https://ermas.example.com` — the login page should load over HTTPS.
- `docker compose -f docker-compose.deploy.yml -f docker-compose.public.yml logs -f cloudflared`
  should show the tunnel registering connections.
- In DevTools → Network, the login request should go to
  `https://ermas.example.com/api/v1/...` and return `200/201`.

> The published site now works **only** over the domain. The direct
> `http://<HOST_ADDR>:3000` URL still answers on the LAN, but the web bundle is
> built for the domain — use the domain for real users. The server needs no
> inbound firewall rules; the tunnel connection is outbound only.

### 6.5 (Optional) Lock it down with Zero Trust Access

To require a login before anyone can reach the app (useful while testing or for
staff-only sites), add an **Access → Applications → Self-hosted** policy in the
Zero Trust dashboard for `ermas.example.com` (e.g. allow specific emails or a
one-time PIN). Cloudflare then gates the domain in front of the app's own login.

## Maintenance Commands

**View Live Logs:**
```bash
docker compose -f docker-compose.deploy.yml logs -f
```

**Stop the Application:**
```bash
docker compose -f docker-compose.deploy.yml down
```

**Restart After Updating `.env` or Code:**
```bash
docker compose -f docker-compose.deploy.yml up -d --build
```

**Reset Database (WARNING: Deletes Data — including uploaded files):**

`down -v` wipes both the Postgres volume and the uploads volume, giving you a
completely fresh volume — so the same auto-provisioning from
[step 4](#4-initialize-the-database-first-time-only) applies: don't run
`prisma db push` or `CREATE DATABASE ermas_logs` manually, just wait for the
API to finish starting, then seed.

```bash
docker compose -f docker-compose.deploy.yml down -v
docker compose -f docker-compose.deploy.yml up -d --build
until docker compose -f docker-compose.deploy.yml logs api 2>&1 | grep -q "Server is running"; do sleep 2; done
docker compose -f docker-compose.deploy.yml exec api node dist/prisma/seed.js
```
