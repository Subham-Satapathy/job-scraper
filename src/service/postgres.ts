import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export class PostgresService {
    async storeJobs(jobs: any[]) {
        try {
            const result = await prisma.job.createMany({
                data: jobs.map(job => ({
                    title: job.title,
                    jobId: job.jobId,
                    location: job.location,
                    description: job.description,
                    jobUrl: job.jobUrl,
                    company: job.company,
                    postedDate: job.postedDate,
                })),
                skipDuplicates: true,
            });
            return result;
        } catch (error) {
            logger.error(`Error storing jobs in database: ${error}`);
            throw error;
        }
    }
} 