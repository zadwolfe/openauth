import type { ProviderConfig } from '../types';

export const notion: ProviderConfig = {
  key: 'notion',
  name: 'Notion',
  authType: 'oauth2',
  authorizationUrl: 'https://api.notion.com/v1/oauth/authorize',
  tokenUrl: 'https://api.notion.com/v1/oauth/token',
  refreshUrl: null, // Notion tokens don't expire
  defaultScopes: [], // Notion doesn't use scopes — permissions are per-page
  scopeSeparator: ' ',
  tokenResponseType: 'json',
  authorizationParams: {
    owner: 'user',
  },
  pkce: false,
  tokenAuthMethod: 'header', // Notion uses Basic auth for token exchange
};
