/**
 * OpenAuth Provider Registry
 *
 * All available OAuth provider configurations.
 * To add a new provider, create a config file in ./configs/ and add it here.
 */
export type { ProviderConfig } from './types';

import { github } from './configs/github';
import { linear } from './configs/linear';
import { slack } from './configs/slack';
import { notion } from './configs/notion';
import type { ProviderConfig } from './types';

/** All available provider configs, keyed by provider key. */
export const providers: Record<string, ProviderConfig> = {
  github,
  linear,
  slack,
  notion,
};

/** Get a provider config by key. Returns undefined if not found. */
export function getProvider(key: string): ProviderConfig | undefined {
  return providers[key];
}

/** Get all provider configs. */
export function getAllProviders(): ProviderConfig[] {
  return Object.values(providers);
}

/** Check if a provider key is valid. */
export function isValidProvider(key: string): boolean {
  return key in providers;
}
