import { pgTable } from "drizzle-orm/pg-core";

export const users = pgTable("users", (t) => ({
	discordId: t.varchar({ length: 191 }).primaryKey(),
	personalServerId: t.varchar({ length: 191 }),
}));
