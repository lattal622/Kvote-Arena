import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const footballApiCredentials = pgTable("football_api_credentials", {
  userId: text("user_id").primaryKey(),
  encryptedKey: text("encrypted_key").notNull(),
  encryptionIv: text("encryption_iv").notNull(),
  authenticationTag: text("authentication_tag").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
