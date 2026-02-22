/**
 * Provider helpers for the server.
 * Combines provider configs with stored credentials from the database.
 */
import { eq } from 'drizzle-orm';
import { getProvider, getAllProviders, type ProviderConfig } from '@openauth/providers';
import { getDb } from '../db';
import { providerCredentials } from '../db/schema';
import { decrypt } from './encryption';

export interface ResolvedProvider {
  config: ProviderConfig;
  clientId: string;
  clientSecret: string;
  scopes: string;
  enabled: boolean;
}

/**
 * Get a fully resolved provider with decrypted credentials.
 * Returns null if the provider doesn't exist or isn't configured.
 */
export async function resolveProvider(
  providerKey: string,
): Promise<ResolvedProvider | null> {
  const config = getProvider(providerKey);
  if (!config) return null;

  const db = getDb();
  const [creds] = await db
    .select()
    .from(providerCredentials)
    .where(eq(providerCredentials.providerKey, providerKey))
    .limit(1);

  if (!creds) return null;
  if (!creds.enabled) return null;

  return {
    config,
    clientId: creds.clientId,
    clientSecret: decrypt(creds.clientSecretEnc),
    scopes: creds.scopes || config.defaultScopes.join(config.scopeSeparator),
    enabled: creds.enabled,
  };
}

/**
 * Get all providers with their configuration status.
 */
export async function getProviderStatuses(): Promise<
  Array<{
    key: string;
    name: string;
    configured: boolean;
    enabled: boolean;
  }>
> {
  const db = getDb();
  const allConfigs = getAllProviders();
  const allCreds = await db.select().from(providerCredentials);

  const credsMap = new Map(allCreds.map((c) => [c.providerKey, c]));

  return allConfigs.map((config) => {
    const creds = credsMap.get(config.key);
    return {
      key: config.key,
      name: config.name,
      configured: !!creds,
      enabled: creds?.enabled ?? false,
    };
  });
}
