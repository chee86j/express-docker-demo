/*
Project map:
express-docker-demo/
├─ src/index.js (this file: Express API + Postgres pool)
├─ Dockerfile (builds and runs this server)
└─ docker-compose.yml (builds app + Postgres for /db-check)
*/
import express from "express";
import dotenv from "dotenv";
import pkg from "pg";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const { Pool } = pkg;

// Load environment variables with defaults
const {
  PORT = 3000,
  DB_HOST = "localhost",
  DB_PORT = 5432,
  DB_USER = "postgres",
  DB_PASSWORD = "postgres",
  DB_NAME = "postgres",
} = process.env;

// Initialize a connection pool so we can test DB access on demand
const pool = new Pool({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
});

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "public");

// Serve the static UI that lives in /public
app.use(express.static(publicDir));

// Landing page: send the HTML UI instead of raw JSON
app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// Provide the previous JSON landing payload from /api for API consumers
app.get("/api", (req, res) => {
  res.json({
    message: "Express Docker demo API",
    endpoints: ["/api/hello", "/db-check"],
  });
});

// Routes to test server and database connectivity
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello World from Dockerized Express!" });
});

// If database ran successfully return a JSON object w/the status "ok" and the database name and server time else
// with the status "error" and the error message
app.get("/db-check", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT NOW() AS server_time");
    res.json({
      status: "ok",
      database: DB_NAME,
      serverTime: rows[0].server_time,
    });
  } catch (error) {
    console.error("Database check failed", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
