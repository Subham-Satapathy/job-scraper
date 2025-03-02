import axios from 'axios';
import logger from '../utils/logger';
import { PostgresService } from '../service/postgres';
import * as cheerio from 'cheerio';
import he from 'he';

export class AmazonScraper {
    private baseUrl = 'https://www.amazon.jobs/en/search.json';
    private postgresService: PostgresService;

    constructor() {
        this.postgresService = new PostgresService();
    }

    private extractJobDescription(description: string): string {
        // Remove HTML tags and decode HTML entities
        const $ = cheerio.load(description);
        let text = $.text();
        text = he.decode(text);
        return text.replace(/\s+/g, ' ').trim();
    }

    public async scrape() {
        let jobs = [];
        let offset = 0;
        const resultLimit = 50;
        const maxResults = 500;
        let hasMoreJobs = true;

        while (hasMoreJobs && offset < maxResults) {
            console.log(`Fetching jobs with offset ${offset}...`);
            try {
                const response = await axios.get(this.baseUrl, {
                    params: {
                        'facets[]': [
                            'normalized_country_code',
                            'normalized_state_name',
                            'normalized_city_name',
                            'location',
                            'business_category',
                            'category',
                            'schedule_type_id',
                            'employee_class',
                            'normalized_location',
                            'job_function_id',
                            'is_manager',
                            'is_intern'
                        ],
                        offset: offset,
                        result_limit: resultLimit,
                        sort: 'relevant',
                        latitude: '',
                        longitude: '',
                        loc_group_id: '',
                        loc_query: '',
                        base_query: '',
                        city: '',
                        country: '',
                        region: '',
                        county: '',
                        query_options: ''
                    }
                });

                const jobData = response.data?.jobs || [];
                
                if (jobData.length > 0) {
                    const processedJobs = jobData.map(job => ({
                        title: job.title,
                        jobId: job.id_icims,
                        location: job.normalized_location || 'Unknown',
                        description: this.extractJobDescription(job.description || 'No description available'),
                        jobUrl: `https://www.amazon.jobs${job.job_path}`,
                        company: 'Amazon',
                        postedDate: new Date(job.posted_date),
                    }));

                    jobs = jobs.concat(processedJobs);
                    offset += resultLimit;
                } else {
                    hasMoreJobs = false;
                }

                // Add a small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                logger.error(`Error fetching Amazon jobs: ${error}`);
                break;
            }
        }

        console.log(`Total Amazon jobs scraped: ${jobs.length}`);

        // Store jobs in PostgreSQL
        try {
            await this.postgresService.storeJobs(jobs);
            logger.info(`Successfully processed Amazon jobs`);
        } catch (error) {
            logger.error(`Error storing Amazon jobs: ${error}`);
            throw error;
        }

        return jobs;
    }
}
