# Express Docker Demo

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

1. `FROM node:20-alpine AS base` – start from a tiny Linux image that already has Node 20; naming the stage `base` makes future multi-stage builds possible.
2. `WORKDIR /app` – every following command runs from `/app`, so paths stay predictable.
3. `COPY package.json ./` – copy only the dependency manifest first to take advantage of Docker layer caching.
4. `RUN npm install --production` – install just the dependencies needed at runtime (no devDependencies) to keep the image small.
5. `COPY src ./src` – bring in the actual application code after dependencies are cached.
6. `EXPOSE 3000` – document for humans/tools that the server listens on port 3000.
7. `CMD ["npm", "start"]` – tell Docker how to boot the container; it runs the same script you use locally.

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
