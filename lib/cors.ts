import { Context, Middleware, Next } from '@colstonjs/core';
import vary from 'vary';

type TOriginFn = (origin: string, callback: (err: Error | null, allow?: boolean | undefined) => void) => void;
interface CorsOptions {
  headers?: string | string[] | undefined;
  origin?: string | string[] | RegExp | TOriginFn;
  methods?: string | string[];
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
  credentials?: boolean;
  allowedHeaders?: string | string[];
  exposedHeaders?: string | string[];
  maxAge?: number | string;
}

interface Header {
  key: string;
  value: string | boolean | undefined;
}

const defaults = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204
};

function isString(s: any): s is string {
  return typeof s == 'string' || s instanceof String;
}

function isOriginAllowed(origin: string, allowedOrigin: string | string[] | RegExp | TOriginFn): boolean {
  if (Array.isArray(allowedOrigin)) {
    for (const allowed of allowedOrigin) {
      if (isOriginAllowed(origin, allowed)) {
        return true;
      }
    }
    return false;
  } else if (isString(allowedOrigin)) {
    return origin === allowedOrigin;
  } else if (allowedOrigin instanceof RegExp) {
    return allowedOrigin.test(origin);
  } else {
    return !!allowedOrigin;
  }
}

function configureOrigin(options: CorsOptions, context: Context): Header[] {
  const requestOrigin = context.req.headers.origin;
  const headers: Header[] = [];

  if (!options.origin || options.origin === '*') {
    headers.push({
      key: 'Access-Control-Allow-Origin',
      value: '*'
    });
  } else if (isString(options.origin)) {
    headers.push({
      key: 'Access-Control-Allow-Origin',
      value: options.origin
    });
    headers.push({
      key: 'Vary',
      value: 'Origin'
    });
  } else {
    const isAllowed = isOriginAllowed(requestOrigin as string, options.origin);
    headers.push({
      key: 'Access-Control-Allow-Origin',
      value: isAllowed ? requestOrigin as string : false
    });
    headers.push({
      key: 'Vary',
      value: 'Origin'
    });
  }

  return headers;
}

function configureMethods(options: CorsOptions): Header {
  let methods = options.methods;
  if (Array.isArray(methods)) {
    methods = methods.join(',');
  }
  return {
    key: 'Access-Control-Allow-Methods',
    value: methods
  };
}

function configureCredentials(options: CorsOptions): Header | null {
  if (options.credentials === true) {
    return {
      key: 'Access-Control-Allow-Credentials',
      value: 'true'
    };
  }
  return null;
}

function configureAllowedHeaders(options: CorsOptions, context: Context): Header[] {
  let allowedHeaders = options.allowedHeaders || options.headers || context.req.headers['access-control-request-headers'];
  const headers: Header[] = [];

  if (Array.isArray(allowedHeaders)) {
    allowedHeaders = allowedHeaders.join(',');
  }
  if (allowedHeaders && allowedHeaders.length) {
    headers.push({
      key: 'Access-Control-Allow-Headers',
      value: allowedHeaders
    });
  }

  return headers;
}

function configureExposedHeaders(options: CorsOptions): Header | null {
  let headers = options.exposedHeaders;
  if (!headers) {
    return null;
  } else if (Array.isArray(headers)) {
    headers = headers.join(',');
  }
  if (headers && headers.length) {
    return {
      key: 'Access-Control-Expose-Headers',
      value: headers
    };
  }
  return null;
}

function configureMaxAge(options: CorsOptions): Header | null {
  const maxAge = (typeof options.maxAge === 'number' || options.maxAge) && options.maxAge.toString();
  if (maxAge && maxAge.length) {
    return {
      key: 'Access-Control-Max-Age',
      value: maxAge
    };
  }
  return null;
}

function applyHeaders(headers: Header[], ctx: Context): void {
  ctx.getHeader = ctx.header.get;
  for (const header of headers) {
    if (header) {
      if (header.key === 'Vary' && header.value) {
        vary(ctx as any, header.value as string);
      } else if (header.value) {
        ctx.setHeader(header.key, header.value as string);
      }
    }
  }
}

function cors(options: CorsOptions, context: Context, next: Next): void {
  const headers: any = [];
  const method = context.req.method && context.req.method.toUpperCase();

  if (method === 'OPTIONS') {
    headers.push(configureOrigin(options, context));
    headers.push(configureCredentials(options));
    headers.push(configureMethods(options));
    headers.push(configureAllowedHeaders(options, context));
    headers.push(configureMaxAge(options));
    headers.push(configureExposedHeaders(options));
    applyHeaders(headers.flat(), context);

    if (options.preflightContinue) {
      next();
    } else {
      context.option({ status: options.optionsSuccessStatus || 204 });
      context.setHeader('Content-Length', '0');
      context.head();
    }
  } else {
    headers.push(configureOrigin(options, context));
    headers.push(configureCredentials(options));
    headers.push(configureExposedHeaders(options));
    applyHeaders(headers.flat(), context);
    next();
  }
}

function middlewareWrapper(options: CorsOptions = defaults): Middleware {
  return function corsMiddleware(context: Context, next: Next) {
    const corsOptions = Object.assign<CorsOptions, CorsOptions>(defaults, options);
    let originCallback: ((origin: string, callback: (err: Error | null, origin: string | boolean | undefined) => void) => void) | null = null;

    if (corsOptions.origin && typeof corsOptions.origin === 'function') {
      originCallback = corsOptions.origin;
    } else if (corsOptions.origin) {
      originCallback = function (origin, cb) {
        cb(null, corsOptions.origin as string);
      };
    }

    if (originCallback) {
      originCallback(context.req.headers.origin as string, function (err, origin): void {
        if (err || !origin) {
          return next(err) as void;
        } else {
          corsOptions.origin = origin as string;
          cors(options, context, next);
        }
      });
    } else {
      return next() as void;
    }
  };
}

export default middlewareWrapper;