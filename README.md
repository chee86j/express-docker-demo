# Express Docker Demo

## Preface: What is Docker and why does tech care?

Docker is a tool that lets developers package an app, its runtime, and its dependencies into a single “container.” You can think of a container like a lightweight, portable computer that always has the exact versions of Node.js, libraries, and system tools you expect. The tech industry loves Docker because:

- Teams can share the same container image, so “works on my machine” bugs disappear.
- Deployments are faster—ops teams run the exact image that developers tested.
- Containers start quickly and use fewer resources than full virtual machines.
- One laptop (or server) can run many isolated projects at once without version conflicts.

This repo shows how to containerize a simple Express + Postgres app so learners can see those benefits in action.

A minimal Express + Postgres "Hello World" API you can use to practice Dockerization. It loads database configuration from the provided `.env` file:

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=Vermillion9195
DB_NAME=express_docker_demo_db
```

## Run locally (no Docker)

1. Make sure PostgreSQL is running on your machine using the credentials above (create the database if it does not exist).
2. Install dependencies: `npm install`
3. Start the server: `npm run dev`
4. Visit `http://localhost:3000/` for the hello endpoint or `http://localhost:3000/db-check` to confirm database connectivity.

> The `/db-check` route performs `SELECT NOW()` using the credentials above, so the database must be reachable before running the command.

## Dockerization checklist (teacher mode)

Follow this like a class lab. Each step tells you **what to do**, **what code you write**, and **why** it matters.

### Step 1 – Gather your ingredients

- Download Docker Desktop from https://www.docker.com/products/docker-desktop/, choose your OS, and install it.
- Source code lives in `src/index.js`.
- Dependencies are listed in `package.json`.
- Runtime configuration (DB credentials) lives in `.env`.

Knowing where everything sits helps explain what gets copied into the container in the next steps.

### Step 2 – Write the Dockerfile

Create a file named `Dockerfile` in the root of the project with:

```
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY src ./src
EXPOSE 3000
CMD ["npm", "start"]
```

Line-by-line teaching notes:

1. `FROM node:20-alpine AS base` – We start by specify the base image to use. In this case since we are using Node.js version 20, we pick the official Node image with the lightweight Alpine Linux variant to keep the image size small.
2. `WORKDIR /app` – then we set the working directory inside the container to `/app`, so all subsequent commands run in that context.
3. `COPY package.json ./` – copy the `package.json` file first to leverage Docker's layer caching for dependencies.
4. `RUN npm install --production` – install just the dependencies needed at runtime (no devDependencies) to keep the image small.
5. `COPY src ./src` – bring in the actual application code after dependencies are cached. 'COPY . ./' would also work here, but copying only what you need is a best practice.
6. `EXPOSE 3000` – tell the container runtime that the app listens on port 3000.
7. `CMD ["npm", "start"]` – tell Docker how to boot the container; it runs the same script you use locally. We can also use `node src/index.js` here if we wanted to be more explicit.

Checkpoint: run `docker build -t express-docker-demo .` to make sure the file works. If it finishes successfully, you now have an image you can run anywhere.

### Step 3 – Run the container against your existing database

```
docker run --env-file .env -p 3000:3000 express-docker-demo
```

- `--env-file .env` reuses all of your local environment variables so the app knows how to reach Postgres.
- `-p 3000:3000` maps the container port back to your host so you can open `http://localhost:3000/`.
- The final argument (`express-docker-demo`) is the image you built in Step 2.

Visit `http://localhost:3000/` (hello JSON) and `http://localhost:3000/db-check` (database check). If the DB is on your host, set `DB_HOST=host.docker.internal` in `.env` so the container can reach it.

### Step 4 – Teach Docker Compose to run both services

Create `docker-compose.yml` at the project root with:

```
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    environment:
      DB_HOST: postgres
    depends_on:
      postgres:
        condition: service_healthy
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    volumes:
      - postgres-data:/var/lib/postgresql/data
volumes:
  postgres-data:
```

Why each block exists:

1. `services:` – Compose always starts with a list of services (containers) to orchestrate.
2. `app:` – defines how to build/run the Express API.
   - `build: .` – reuse the Dockerfile from Step 2.
   - `ports` – same mapping as Step 3 so you can reach the API.
   - `env_file` – load every key from `.env`.
   - `environment -> DB_HOST: postgres` – override the host so the API talks to the Compose-managed Postgres service.
   - `depends_on -> postgres` – wait until the database passes its health check before starting the app to avoid connection errors during boot.
3. `postgres:` – spins up a real Postgres database.
   - `image` – pull the official lightweight image.
   - `restart: unless-stopped` – keep the DB running unless you explicitly stop it.
   - `environment` – map `.env` values to the variables that Postgres expects (names differ slightly).
   - `healthcheck` – `pg_isready` confirms Postgres is ready before the app connects.
   - `volumes` – persist data in a named Docker volume (`postgres-data`) instead of losing it when the container stops.
4. `volumes:` – declares the named volume so Docker keeps the data alive between runs.

### Step 5 – Run the full stack like a proctor

```
docker compose up --build
```

- `--build` ensures code changes are rebuilt into the image before Compose starts.
- Compose networks the containers together automatically, so `DB_HOST=postgres` just works.

Once logs show both services as healthy:

- `http://localhost:3000/` – Hello World JSON from the API container.
- `http://localhost:3000/db-check` – response should include `status: "ok"` showing the API reached the Postgres container.

### Step 6 – Tear down and discuss

- Stop foreground runs with `Ctrl+C`.
- Remove containers (but keep the volume) with `docker compose down`.
- Add `-v` (`docker compose down -v`) if you want to delete the database data and start fresh for the next student.
