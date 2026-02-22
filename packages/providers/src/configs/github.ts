import type { ProviderConfig } from '../types';

export const github: ProviderConfig = {
  key: 'github',
  name: 'GitHub',
  authType: 'oauth2',
  authorizationUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  refreshUrl: null, // GitHub tokens don't expire (no refresh)
  defaultScopes: ['repo'],
  scopeSeparator: ' ',
  tokenResponseType: 'json',
  authorizationParams: {},
  pkce: false,
  tokenAuthMethod: 'body',
};
