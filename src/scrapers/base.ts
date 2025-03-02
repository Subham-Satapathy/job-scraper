import { createHash } from 'crypto';
import prisma from '../config/database';
import { Job } from '../models/types';
import logger from '../utils/logger';

export abstract class BaseScraper {
    protected abstract company: string;

    protected generateJobId(title: string, company: string, location: string): string {
        const data = `${title}${company}${location}`.toLowerCase();
        return createHash('md5').update(data).digest('hex');
    }

    protected abstract scrape(): Promise<Omit<Job, 'jobId'>[]>;

    protected async processJobs(jobs: Omit<Job, 'jobId'>[]): Promise<void> {
        for (const job of jobs) {
            try {
                const jobId = this.generateJobId(job.title, job.company, job.location);
                await this.upsertJob({ ...job, jobId });
            } catch (error) {
                logger.error(`Failed to process job: ${error}`);
            }
        }
    }

    private async upsertJob(job: Job): Promise<void> {
        await prisma.job.upsert({
            where: { jobId: job.jobId },
            update: {
                title: job.title,
                location: job.location,
                description: job.description,
                postedDate: job.postedDate,
                updatedAt: new Date()
            },
            create: job
        });
    }
}
