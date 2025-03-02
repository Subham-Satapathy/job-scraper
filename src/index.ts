import { startScheduler } from './scheduler';
import { handleJobsRoute } from './api/routes/jobs';
const API_KEY = process.env.API_KEY;
Bun.serve({
    port: 3000,
    async fetch(req) {
        const url = new URL(req.url);
        const apiKey = req.headers.get("x-api-key");
        if (apiKey !== API_KEY) {
            return new Response("Forbidden", { status: 403 });
        }
        if (url.pathname === '/jobs' && req.method === 'GET') {
            return handleJobsRoute(req);
        }

        return new Response('Not Found', { status: 404 });
    }
});

startScheduler();