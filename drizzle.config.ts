import type { Config } from "drizzle-kit";

if (!process.env.PRIVATE_DATABASE_URL)
	throw new Error("DATABASE_URL is not set");

export default {
	schema: "./src/db/schema.ts",
	out: "./src/db/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL || "postgres://localhost:5432/panchobot",
	},
	casing: "snake_case",
} satisfies Config;
