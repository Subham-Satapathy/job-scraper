import axios from 'axios';
import logger from '../utils/logger';
import { PostgresService } from '../service/postgres';
import * as cheerio from 'cheerio';
import he from 'he';

export class MicrosoftScraper {
    private baseUrl = 'https://gcsservices.careers.microsoft.com/search/api/v1/search';
    private postgresService: PostgresService;

    constructor() {
        this.postgresService = new PostgresService();
    }


    extractJobDescription(html: string): string {
        const $ = cheerio.load(html);
        let text = $('p').map((_, el) => $(el).text()).get().join(' ');
        text = he.decode(text);
        return text.replace(/\s+/g, ' ').trim();
    }


    public async scrape() {
    let jobs = [];
    let page = 1;
    const pageSize = 20;
    const maxPages = 50; //As I am running this on a free plan, I can only scrape 50 pages to match with neon db
    let hasMoreJobs = true;

    while (hasMoreJobs && page <= maxPages) {
        console.log(`Fetching page ${page}...`);
        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    l: 'en_us',
                    pg: page,
                    pgSz: pageSize,
                    o: 'Relevance',
                    flt: true,
                },
            });

            const jobData = response.data?.operationResult?.result?.jobs || []; // Extract jobs array
            if (jobData.length > 0) {
                jobs = jobs.concat(
                    jobData.map((job) => ({
                        title: job.title,
                        jobId: job.jobId,
                        location: job.properties?.locations?.join(', ') || 'Unknown',
                        description: this.extractJobDescription(job.properties?.description || 'No description available'),
                        jobUrl: `https://jobs.careers.microsoft.com/global/en/job/${job.jobId}`,
                        company: 'Microsoft',
                        postedDate: new Date(job.postingDate),
                    }))
                );
                page++; // Move to next page
            } else {
                hasMoreJobs = false; // Stop if no more jobs
            }
        } catch (error) {
            console.error(`Error fetching Microsoft jobs: ${error}`);
            break;
        }
    }

    console.log(`Total jobs scraped: ${jobs.length}`);

    // Store jobs in PostgreSQL
    try {
        await this.postgresService.storeJobs(jobs);
        logger.info(`Successfully processed Microsoft jobs`);
    } catch (error) {
        logger.error(`Error storing Microsoft jobs: ${error}`);
        throw error;
    }

    return jobs;
}
}
