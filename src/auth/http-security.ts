export interface AuthHTTPOptions {
  baseURL: string;
  webOrigins: string[];
  allowedReturnURLs: string[];
  nativeOrigins?: string[];
}

const returnFields = ['callbackURL', 'redirectTo', 'errorCallbackURL', 'newUserCallbackURL'];

/** Only HTTPS origins, or explicit loopback HTTP for local integration tools. */
export function exactOrigin(value: string): string {
  const url = new URL(value);
  if (value !== url.origin || value.includes('*') ||
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) {
    throw new TypeError('Auth requires an exact HTTPS origin (HTTP only on loopback)');
  }
  return value;
}

export function authHTTPPolicy(options: AuthHTTPOptions) {
  const apiOrigin = exactOrigin(options.baseURL);
  const origins = new Set([apiOrigin, ...options.webOrigins.map(exactOrigin)]);
  const nativeOrigins = new Set(options.nativeOrigins ?? []);
  for (const value of nativeOrigins) {
    if (!/^[a-z][a-z0-9-]+:\/\/$/.test(value) ||
      ['http://', 'https://', 'exp://', 'file://', 'javascript://', 'data://'].includes(value)) {
      throw new TypeError('Native Auth requires an explicit private application scheme');
    }
  }
  const returns = new Set(options.allowedReturnURLs);
  for (const value of returns) {
    const url = new URL(value);
    const nativeReturn = nativeOrigins.has(`${url.protocol}//`) && !!url.hostname;
    if ((!origins.has(url.origin) && !nativeReturn) || url.href !== value || url.username || url.password || url.hash || value.includes('*')) {
      throw new TypeError('Auth return URLs must be canonical URLs on an allowed origin');
    }
  }
  const isReturnAllowed = (value: unknown) => typeof value === 'string' && (
    returns.has(value) || (value.startsWith('/') && !value.startsWith('//') && returns.has(`${apiOrigin}${value}`))
  );
  return { origins, nativeOrigins, isReturnAllowed };
}

/** Browser Auth boundary. Internal auth.api calls remain server-only. */
export function secureAuthHandler(
  handler: (request: Request) => Promise<Response>,
  policy: ReturnType<typeof authHTTPPolicy>,
) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin');
    const expoOrigin = request.headers.get('expo-origin');
    const allowedOrigin = origin !== null && policy.origins.has(origin);
    const finish = (response: Response, cors = allowedOrigin) => {
      response.headers.append('vary', 'Origin');
      response.headers.set('cache-control', 'no-store');
      response.headers.set('referrer-policy', 'no-referrer');
      if (cors && origin) {
        response.headers.set('access-control-allow-origin', origin);
        response.headers.set('access-control-allow-credentials', 'true');
        response.headers.set('access-control-expose-headers', 'Retry-After');
      }
      return response;
    };
    const denied = (cors = allowedOrigin) => finish(Response.json({ code: 'AUTH_HTTP_FORBIDDEN', message: 'Auth request rejected' }, { status: 403 }), cors);
    // The official Expo client supplies this header instead of a browser Origin.
    // Never let it override a browser origin or grant browser preflight access.
    const nativeRequest = expoOrigin !== null && policy.nativeOrigins.has(expoOrigin) &&
      origin === null && ![...request.headers.keys()].some((key) => key.startsWith('sec-fetch-'));
    if (expoOrigin !== null && !nativeRequest) return denied(false);
    if (request.method === 'OPTIONS') {
      const method = request.headers.get('access-control-request-method');
      const headers = (request.headers.get('access-control-request-headers') ?? '').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
      if (!allowedOrigin || !['GET', 'POST'].includes(method ?? '') || headers.some((value) => value !== 'content-type')) return denied(false);
      return finish(new Response(null, { status: 204, headers: {
        'access-control-allow-methods': 'GET, POST',
        'access-control-allow-headers': 'Content-Type',
        vary: 'Access-Control-Request-Method, Access-Control-Request-Headers',
      } }));
    }
    // Navigations to token-bearing GET callbacks may omit Origin. Mutations may not.
    if ((origin !== null && !allowedOrigin) || (!['GET', 'HEAD'].includes(request.method) && !allowedOrigin && !nativeRequest)) return denied(false);
    const query = new URL(request.url).searchParams;
    for (const field of returnFields) {
      if (query.getAll(field).some((value) => !policy.isReturnAllowed(value))) return denied();
    }
    if (request.method === 'POST') {
      // One wire format avoids alternate parsers bypassing the return allowlist.
      if (request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
        return finish(Response.json({ code: 'UNSUPPORTED_MEDIA_TYPE' }, { status: 415 }));
      }
      let body: unknown;
      try { body = await request.clone().json(); } catch {
        return finish(Response.json({ code: 'INVALID_JSON' }, { status: 400 }));
      }
      if (body && typeof body === 'object') {
        if (['/api/auth/sign-in/social', '/api/auth/link-social'].includes(new URL(request.url).pathname) &&
          ('idToken' in body || 'additionalParams' in body || 'scopes' in body)) return denied();
        for (const field of returnFields) {
          if (field in body && !policy.isReturnAllowed((body as Record<string, unknown>)[field])) return denied();
        }
      }
    }
    if (nativeRequest) {
      const headers = new Headers(request.headers);
      headers.set('origin', expoOrigin!);
      request = new Request(request, { headers });
    }
    return finish(await handler(request));
  };
}
