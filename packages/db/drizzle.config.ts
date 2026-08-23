import type { Config } from "drizzle-kit"

export default {
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL?.replace("file:", "") ?? "../../agent-os.db",
  },
  verbose: true,
  strict: false,
} satisfies Config
