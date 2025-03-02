import { JobController } from '../controllers/jobs';
import logger from '../../utils/logger';
const jobController = new JobController();

export async function handleJobsRoute(req: Request) {
    const url = new URL(req.url);
    const query = Object.fromEntries(url.searchParams);

    const { page, limit, company, location, fromDate } = query;

    const result = await jobController.getJobs({
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        company: company?.toString(),
        location: location?.toString(),
        fromDate: fromDate ? new Date(fromDate.toString()) : undefined
    });

    return Response.json(result);
}