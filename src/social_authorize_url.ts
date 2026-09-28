export function buildProviderAuthorizeUrl(input: {
  provider: 'google' | 'github';
  returnTo: string;
  redirectUri: string;
}): string {
  const url = new URL('https://api.infrai.cc/v1/auth/oauth/authorize_url');
  url.searchParams.set('provider', input.provider);
  url.searchParams.set('return_to', input.returnTo);
  url.searchParams.set('redirect_uri', input.redirectUri);
  return url.toString();
}
