import { sqliteTable, text } from "drizzle-orm/sqlite-core";
export const connections = sqliteTable("connections", {
  userId: text("user_id").primaryKey(),
  merchantId: text("merchant_id").notNull(),
  mode: text("mode", { enum: ["test", "live"] }).notNull(),
  ciphertext: text("ciphertext").notNull(),
  state: text("state", { enum: ["pending", "connected"] }).notNull(),
  userCode: text("user_code"),
  expiresAt: text("expires_at").notNull(),
});
