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

### 3. Build and Start the Application

Start the Docker containers in detached mode. This step will pull necessary base images and build the API and Web services.

```bash
docker compose -f docker-compose.deploy.yml up -d --build
```

### 4. Initialize the Database (First-Time Only)

When starting the application for the very first time, the database will be empty. You need to push the Prisma schema to create the tables, create the separate logs database, and then run the seed script to populate initial data.

```bash
# Push the schema to create database tables (main DB)
docker compose -f docker-compose.deploy.yml exec api npx prisma db push

# Create the SEPARATE activity-logs database (the app auto-creates its table on start).
# Use the POSTGRES_USER from your .env (default: ermas).
docker compose -f docker-compose.deploy.yml exec postgres \
  psql -U ermas -c "CREATE DATABASE ermas_logs;"
docker compose -f docker-compose.deploy.yml restart api

# Seed programmes, subjects and the exam-staff directory
docker compose -f docker-compose.deploy.yml exec api node dist/prisma/seed.js
```

> **Note:** Students and batches are **not** seeded — import them from Excel via the
> admin **Students** screen. If you skip the `ermas_logs` step the app still runs;
> the Activity Logs feature is simply disabled (with a warning in the API logs).

### 4b. Deploying Updates (pulling new code)

To roll out a new version after the initial setup:

```bash
cd ermas
git pull

# Rebuild and restart the containers with the new code
docker compose -f docker-compose.deploy.yml up -d --build

# Sync any schema changes (new columns/tables) into the database
docker compose -f docker-compose.deploy.yml exec api npx prisma db push

# (Optional) re-run the seed to add any new programmes/subjects/exam staff.
# It is idempotent, BUT it resets the four staff-account passwords to the seed
# default — re-set them afterwards if you have changed them in production.
docker compose -f docker-compose.deploy.yml exec api node dist/prisma/seed.js
```

If `prisma db push` warns about potential data loss on a change you expect and
have reviewed, re-run it with `--accept-data-loss`.

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

**Reset Database (WARNING: Deletes Data):**
```bash
docker compose -f docker-compose.deploy.yml down -v
docker compose -f docker-compose.deploy.yml up -d --build
docker compose -f docker-compose.deploy.yml exec api npx prisma db push
docker compose -f docker-compose.deploy.yml exec postgres psql -U ermas -c "CREATE DATABASE ermas_logs;"
docker compose -f docker-compose.deploy.yml restart api
docker compose -f docker-compose.deploy.yml exec api node dist/prisma/seed.js
```
