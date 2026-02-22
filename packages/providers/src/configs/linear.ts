import type { ProviderConfig } from '../types';

export const linear: ProviderConfig = {
  key: 'linear',
  name: 'Linear',
  authType: 'oauth2',
  authorizationUrl: 'https://linear.app/oauth/authorize',
  tokenUrl: 'https://api.linear.app/oauth/token',
  refreshUrl: null, // Linear tokens don't expire
  defaultScopes: ['read', 'write', 'issues:create'],
  scopeSeparator: ',',
  tokenResponseType: 'json',
  authorizationParams: {
    response_type: 'code',
    prompt: 'consent',
  },
  pkce: false,
  tokenAuthMethod: 'body',
};
