import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;

export const db = new Pool(
    process.env.DATABASE_URL
        ? {
              connectionString: process.env.DATABASE_URL,
              ssl: {
                  rejectUnauthorized: false
              }
          }
        : {
              host: process.env.DB_HOST,
              user: process.env.DB_USER,
              password: process.env.DB_PASSWORD,
              database: process.env.DB_DATABASE,
              port: process.env.DB_PORT
              // No SSL for local development
          }
);