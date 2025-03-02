import { Job, JobFilters, PaginatedResponse } from '../../models/types';
import prisma from '../../config/database';
import { Prisma } from '@prisma/client';
import logger from '../../utils/logger';
export class JobController {
    async getJobs(filters: JobFilters = {}): Promise<PaginatedResponse<Job>> {
        const page = filters.page && filters.page > 0 ? filters.page : 1; // Default to page 1
        const maxLimit = 100; // Set a reasonable upper limit
        const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, maxLimit) : 10; // Default to 10, max 100

        const where: Prisma.JobWhereInput = {
            ...(filters.company && { company: filters.company }),
            ...(filters.location && { location: { contains: filters.location, mode: Prisma.QueryMode.insensitive } }),
            ...(filters.fromDate && { postedDate: { gte: filters.fromDate } })
        };

        const [total, jobs] = await Promise.all([
            prisma.job.count({ where }),
            prisma.job.findMany({
                where,
                orderBy: { postedDate: 'desc' },
                skip: (page - 1) * limit, // Safe pagination
                take: limit
            })
        ]);

        return {
            data: jobs,
            total,
            page,
            limit
        };
    }
}


