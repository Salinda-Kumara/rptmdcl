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

When starting the application for the very first time, the database will be empty. You need to push the Prisma schema to create the tables, and then run the seed script to populate initial data (like roles and admin users).

```bash
# Push the schema to create database tables
docker compose -f docker-compose.deploy.yml exec api npx prisma db push

# Seed the database
docker compose -f docker-compose.deploy.yml exec api node dist/prisma/seed.js
```

### 5. Access the Application

The application is now live! Open a web browser on any machine in the network and navigate to:

- **Web Portal:** `http://<HOST_ADDR>:3000`
- **API Base URL:** `http://<HOST_ADDR>:3001/api/v1`

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
docker compose -f docker-compose.deploy.yml exec api node dist/prisma/seed.js
```
