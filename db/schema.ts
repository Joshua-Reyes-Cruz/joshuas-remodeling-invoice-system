import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * The first release is intentionally a single-company workspace. Keeping the
 * workspace snapshot together makes document versioning atomic while the UI
 * and workflow settle. The normalized customer/job/document tables planned
 * for the multi-user release can be introduced without changing the UI.
 */
export const workspaceStates = sqliteTable("workspace_states", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerEmail: text("owner_email").notNull().unique(),
  payload: text("payload").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Metadata for signed PDFs and other immutable job files stored in R2. */
export const storedDocuments = sqliteTable("stored_documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerEmail: text("owner_email").notNull(),
  documentId: text("document_id").notNull(),
  objectKey: text("object_key").notNull().unique(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull().default("application/pdf"),
  sizeBytes: integer("size_bytes").notNull(),
  source: text("source").notNull().default("manual"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** One encrypted OAuth connection per private workspace owner. */
export const docusignConnections = sqliteTable("docusign_connections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerEmail: text("owner_email").notNull().unique(),
  accountId: text("account_id").notNull(),
  accountName: text("account_name").notNull(),
  baseUri: text("base_uri").notNull(),
  accessTokenEncrypted: text("access_token_encrypted").notNull(),
  refreshTokenEncrypted: text("refresh_token_encrypted").notNull(),
  expiresAt: text("expires_at").notNull(),
  connectedAt: text("connected_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Short-lived, single-use OAuth states prevent callback forgery. */
export const docusignOauthStates = sqliteTable("docusign_oauth_states", {
  state: text("state").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
