import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  jsonb,
  pgEnum,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ─── Enums ──────────────────────────────────────────────────────────────────

export const sessionStatusEnum = pgEnum('session_status', [
  'pending',
  'completed',
  'expired',
]);

// ─── Tables ─────────────────────────────────────────────────────────────────

/**
 * OAuth connections — stores encrypted tokens for each user+provider pair.
 */
export const connections = pgTable(
  'connections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerKey: text('provider_key').notNull(),
    connectionId: text('connection_id').notNull(),
    accessTokenEnc: text('access_token_enc').notNull(),
    refreshTokenEnc: text('refresh_token_enc'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    scopes: text('scopes'),
    rawCredentials: text('raw_credentials'), // encrypted full token response
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('connections_provider_connection_idx').on(
      table.providerKey,
      table.connectionId,
    ),
  ],
);

/**
 * Connect sessions — temporary sessions for the OAuth flow.
 * Expire after 10 minutes.
 */
export const connectSessions = pgTable('connect_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  token: text('token').notNull().unique(),
  providerKey: text('provider_key').notNull(),
  connectionId: text('connection_id').notNull(),
  state: text('state').notNull(), // OAuth CSRF state
  codeVerifier: text('code_verifier'), // PKCE
  status: sessionStatusEnum('status').default('pending').notNull(),
  redirectUri: text('redirect_uri'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

/**
 * Provider credentials — OAuth app credentials set by the deployer.
 * One row per provider (e.g. GitHub, Linear).
 */
export const providerCredentials = pgTable('provider_credentials', {
  id: uuid('id').defaultRandom().primaryKey(),
  providerKey: text('provider_key').notNull().unique(),
  clientId: text('client_id').notNull(),
  clientSecretEnc: text('client_secret_enc').notNull(), // encrypted
  scopes: text('scopes'),
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─── Types ──────────────────────────────────────────────────────────────────

export type Connection = typeof connections.$inferSelect;
export type NewConnection = typeof connections.$inferInsert;
export type ConnectSession = typeof connectSessions.$inferSelect;
export type NewConnectSession = typeof connectSessions.$inferInsert;
export type ProviderCredential = typeof providerCredentials.$inferSelect;
export type NewProviderCredential = typeof providerCredentials.$inferInsert;
