// Vite dev plugin — exposes /api/*.ts files as serverless-style endpoints
// during `npm run dev`. In production these same files are deployed by Vercel
// automatically; this plugin exists only so we don't have to run `vercel dev`.

import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import fs from 'node:fs';

const API_DIR_NAME = 'api';

function readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

// Tiny shim that mimics the subset of @vercel/node's response API the
// handler uses (status().json(), status().end()).
function buildResLike(res: ServerResponse) {
    return {
        status(code: number) {
            res.statusCode = code;
            return {
                json(data: unknown) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                    return undefined;
                },
                end() {
                    res.end();
                    return undefined;
                },
            };
        },
    };
}

export function devApiPlugin(): Plugin {
    return {
        name: 'tracksmart-dev-api',
        configureServer(server: ViteDevServer) {
            const apiDir = path.resolve(server.config.root, API_DIR_NAME);
            if (!fs.existsSync(apiDir)) return;

            server.middlewares.use(async (req, res, next) => {
                if (!req.url?.startsWith('/api/')) return next();

                // Strip query string + leading /api/.
                const route = req.url.replace(/^\/api\//, '').split('?')[0];
                if (!route) return next();

                // Block underscore-prefixed shared files (templates, helpers).
                const segments = route.split('/');
                if (segments.some((s) => s.startsWith('_'))) return next();

                const candidates = [
                    path.join(apiDir, `${route}.ts`),
                    path.join(apiDir, `${route}.js`),
                    path.join(apiDir, route, 'index.ts'),
                    path.join(apiDir, route, 'index.js'),
                ];
                const filePath = candidates.find((p) => fs.existsSync(p));
                if (!filePath) return next();

                try {
                    // ssrLoadModule reloads on every request → no cache to bust
                    // when you edit /api/*.ts files.
                    const mod = await server.ssrLoadModule(filePath);
                    const handler = (mod.default ?? mod.handler) as
                        | ((req: unknown, res: unknown) => unknown | Promise<unknown>)
                        | undefined;

                    if (typeof handler !== 'function') {
                        res.statusCode = 500;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ ok: false, error: `No default export in /api/${route}` }));
                        return;
                    }

                    const raw = await readBody(req);
                    let body: unknown = undefined;
                    if (raw.length > 0) {
                        try {
                            body = JSON.parse(raw);
                        } catch {
                            body = raw;
                        }
                    }

                    await handler(
                        { method: req.method, headers: req.headers, url: req.url, body },
                        buildResLike(res)
                    );
                } catch (err) {
                    console.error('[dev-api] handler error:', err);
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(
                        JSON.stringify({
                            ok: false,
                            error: err instanceof Error ? err.message : 'Unknown error',
                        })
                    );
                }
            });
        },
    };
}
