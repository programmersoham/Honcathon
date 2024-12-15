import { jsonb, pgTable, serial, text, timestamp,vector,integer,uuid } from "drizzle-orm/pg-core";

export type NewUser = typeof users.$inferInsert;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email"),
  settings: jsonb("settings"),                                    
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});




export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  hash: text("hash").notNull(),
});

export const chunks = pgTable("chunks", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id")
    .references(() => documents.id)
    .notNull(),
  chunkNumber: integer("chunk_number").notNull(),
  text: text("text").notNull(),
  embedding: vector("embedding", { dimensions: 768 }),
  hash: text("hash").notNull(),
});
