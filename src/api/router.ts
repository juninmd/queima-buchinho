import http from 'http';
import { HttpError, readJson } from './http';

export interface RouteContext {
  req: http.IncomingMessage;
  url: URL;
  userId: number;
  params: Record<string, string>;
  /** Corpo JSON (já validado como JSON; o formato é responsabilidade da rota). */
  body: () => Promise<unknown>;
}

/** O retorno vira o corpo JSON da resposta 200; erros saem via `HttpError`. */
export type Handler = (ctx: RouteContext) => Promise<unknown>;

interface Route { method: string; segments: string[]; handler: Handler }

const split = (path: string): string[] => path.split('/').filter(Boolean);

export class Router {
  private routes: Route[] = [];

  public add(method: string, pattern: string, handler: Handler): this {
    this.routes.push({ method, segments: split(pattern), handler });
    return this;
  }

  public async dispatch(req: http.IncomingMessage, userId: number): Promise<unknown> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const parts = split(url.pathname);
    let pathMatched = false;

    for (const route of this.routes) {
      const params = matchSegments(route.segments, parts);
      if (!params) continue;
      pathMatched = true;
      if (route.method !== req.method) continue;
      return route.handler({ req, url, userId, params, body: () => readJson(req) });
    }
    throw new HttpError(pathMatched ? 405 : 404, pathMatched ? 'method_not_allowed' : 'not_found');
  }
}

function matchSegments(pattern: string[], parts: string[]): Record<string, string> | null {
  if (pattern.length !== parts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i].startsWith(':')) {
      try { params[pattern[i].slice(1)] = decodeURIComponent(parts[i]); } catch { return null; }
    } else if (pattern[i] !== parts[i]) return null;
  }
  return params;
}
