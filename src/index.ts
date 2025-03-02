import { startScheduler } from './scheduler';
import { handleJobsRoute } from './api/routes/jobs';

Bun.serve({
    port: 3000,
    async fetch(req) {
        const url = new URL(req.url);
        
        if (url.pathname === '/jobs' && req.method === 'GET') {
            return handleJobsRoute(req);
        }

        return new Response('Not Found', { status: 404 });
    }
});

startScheduler();