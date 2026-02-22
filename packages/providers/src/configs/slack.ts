import type { ProviderConfig } from '../types';

export const slack: ProviderConfig = {
  key: 'slack',
  name: 'Slack',
  authType: 'oauth2',
  authorizationUrl: 'https://slack.com/oauth/v2/authorize',
  tokenUrl: 'https://slack.com/api/oauth.v2.access',
  refreshUrl: null, // Slack bot tokens don't expire
  defaultScopes: ['chat:write', 'channels:read'],
  scopeSeparator: ',',
  tokenResponseType: 'json',
  authorizationParams: {},
  pkce: false,
  tokenAuthMethod: 'body',
};
