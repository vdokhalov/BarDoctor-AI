import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { lifecycleRuntime } from './lifecycle-runtime';
export async function setupServer() {
    const extra = { restaurants: './app/api/restaurants/route', restaurantMe: './app/api/restaurants/me/route', store: './app/api/store/route', storeKey: './app/api/store/[key]/route', usersMe: './app/api/users/me/route', logout: './app/api/auth/logout/route', sessions: './app/api/users/sessions/route', opportunities: './app/api/opportunities/route', competitors: './app/api/competitors/me/route', reviews: './app/api/reviews/home/route', health: './app/api/business-health/route', newVenue: './app/venues/new/route' };
    const r = await lifecycleRuntime(extra);
    const routes: Record<string, string> = { '/api/auth/register': 'register', '/api/auth/login': 'login', '/api/auth/bootstrap': 'bootstrap', '/api/auth/logout': 'logout', '/api/restaurants': 'restaurants', '/api/restaurants/me': 'restaurantMe', '/api/store': 'store', '/api/users/me': 'usersMe', '/api/venues': 'venues', '/api/users/sessions': 'sessions', '/api/opportunities': 'opportunities', '/api/competitors/me': 'competitors', '/api/reviews/home': 'reviews', '/api/business-health': 'health' };
    let failSave = false, failDirectory = false;
    const requests: {
        path: string;
        method: string;
        status: number;
    }[] = [];
    const root = path.resolve('public');
    fs.mkdirSync('outputs/setup', { recursive: true });
    const baseline = (name: string) => execFileSync('git', ['-c', 'safe.directory=' + process.cwd().replaceAll('\\', '/'), 'show', (process.env.BD_SETUP_BASELINE_REF || '019eb828235c362344b7519e1e6240b161e5ff92') + ':' + name], { maxBuffer: 12 * 1024 * 1024 });
    const server = http.createServer(async (req, res) => {
        try {
            const url = new URL(req.url || '/', 'http://127.0.0.1:4179');
            if (url.pathname === '/venues/new') {
                const response = await r.api.newVenue.GET(new Request(url));
                res.writeHead(response.status, Object.fromEntries(response.headers));
                res.end(await response.text());
                return;
            }
            if (url.pathname.startsWith('/api/')) {
                const parts = [];
                for await (const c of req)
                    parts.push(c);
                const key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
                const group = key ? 'storeKey' : routes[url.pathname.replace(/\/$/, '')];
                if (!group) {
                    console.log('UNHANDLED', req.method, url.pathname);
                    res.writeHead(404);
                    res.end('{}');
                    return;
                }
                const request = new Request(url, { method: req.method, headers: req.headers as Record<string, string>, ...(['GET', 'HEAD'].includes(req.method || 'GET') ? {} : { body: Buffer.concat(parts) }) });
                if (failSave && group === 'restaurants' && req.method === 'POST') {
                    failSave = false;
                    res.writeHead(503, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: false, error: 'Тест: сохранение временно недоступно. Повторите попытку.' }));
                    requests.push({ path: url.pathname, method: req.method, status: 503 });
                    return;
                }
                const response = await r.api[group][req.method || 'GET'](request, { params: Promise.resolve({ key }) } as never);
                res.writeHead(response.status, Object.fromEntries(response.headers));
                res.end(await response.text());
                requests.push({ path: url.pathname, method: req.method || 'GET', status: response.status });
                return;
            }
            if (process.env.BD_SETUP_BASELINE === '1' && (!url.pathname.includes('.') || /\/assets\/index-BQGspy0I.*\.js$/.test(url.pathname))) {
                res.writeHead(200, { 'Content-Type': url.pathname.endsWith('.js') ? 'text/javascript' : 'text/html' });
                res.end(baseline(url.pathname.endsWith('.js') ? 'public/assets/index-BQGspy0I.js' : 'public/app.html'));
                return;
            }
            if (failDirectory && url.pathname === '/venue-location-data.js') {
                failDirectory = false;
                res.writeHead(503);
                res.end('temporary directory failure');
                return;
            }
            const file = path.resolve(root, '.' + (url.pathname.includes('.') ? url.pathname : '/app.html'));
            if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) {
                res.writeHead(404);
                res.end();
                return;
            }
            res.writeHead(200, { 'Content-Type': ({ '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' } as Record<string, string>)[path.extname(file)] || 'application/octet-stream' });
            fs.createReadStream(file).pipe(res);
        }
        catch (e) {
            console.error(e);
            res.writeHead(500);
            res.end(JSON.stringify({ ok: false, error: 'Test server error' }));
        }
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    return { r, requests, base: 'http://127.0.0.1:' + (server.address() as {
            port: number;
        }).port, failSave: () => { failSave = true; }, failDirectory: () => { failDirectory = true; }, close: async () => { await new Promise<void>(resolve => server.close(() => resolve())); r.close(); } };
}
