import type { Page } from 'puppeteer';
import puppeteer from 'puppeteer';
import logger from '../utils/logger';
import { PostgresService } from '../service/postgres';
import { createHash } from 'crypto';

export class GoogleScraper {
    private baseUrl = 'https://www.google.com/about/careers/applications/jobs/results/';
    private postgresService: PostgresService;

    constructor() {
        this.postgresService = new PostgresService();
    }

    private async fetchJobDescription(page: Page, jobUrl: string): Promise<string> {
        try {
            await page.goto(jobUrl, { waitUntil: 'networkidle2' });
            
            const description = await page.evaluate(() => {
                const descriptionDiv = document.querySelector('.aG5W3');
                if (!descriptionDiv) return 'No Description available';
                
                return Array.from(descriptionDiv.querySelectorAll('p'))
                    .map(p => p.innerText.trim())
                    .join(' ');
            });
            
            return description;
        } catch (error) {
            logger.error(`Error fetching job description: ${error}`);
            return 'Failed to fetch description';
        }
    }

    public async scrape() {
        const browser = await puppeteer.launch({
            headless: true
          });
        const page = await browser.newPage();
        let jobs = [];
        let pageNum = 1;
        let nextPageUrl: string | null = `${this.baseUrl}?page=${pageNum}`;
        const MAX_PAGES = 50;

        while (nextPageUrl && pageNum <= MAX_PAGES) {
            try {
                logger.info(`Navigating to: ${nextPageUrl}`);
                await page.goto(nextPageUrl, { waitUntil: 'networkidle2' });

                const jobData = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll('.lLd3Je')).map(job => {
                        const jobUrl = (job.querySelector('a') as HTMLAnchorElement)?.href;
                        const urlSegment = jobUrl?.split('/').pop() || '';
                        
                        return {
                            title: (job.querySelector('.QJPWVe') as HTMLElement)?.innerText?.trim(),
                            jobId: urlSegment,
                            location: (job.querySelector('.r0wTof') as HTMLElement)?.innerText?.trim() || 'Unknown',
                            jobUrl: jobUrl,
                            postedDate: new Date().toISOString(),
                            company: 'Google',
                            description: ''
                        };
                    });
                });

                jobData.forEach(job => {
                    job.jobId = createHash('md5').update(job.jobId || '').digest('hex');
                });

                for (let job of jobData) {
                    job.description = await this.fetchJobDescription(page, job.jobUrl);
                }

                if (jobData.length === 0) {
                    logger.info('No more jobs found. Stopping pagination.');
                    break;
                }

                jobs = jobs.concat(jobData);
                
                const nextPageUrlExists = await page.evaluate(() => {
                    const nextButton = document.querySelector('a[aria-label="Go to next page"]') as HTMLAnchorElement;
                    return nextButton ? nextButton.href : null;
                });

                if (pageNum >= MAX_PAGES) {
                    logger.info(`Reached max page limit (${MAX_PAGES}). Stopping.`);
                    nextPageUrl = null;
                }

                if (nextPageUrlExists) {
                    pageNum++;
                    nextPageUrl = `${this.baseUrl}?page=${pageNum}`;
                } else {
                    nextPageUrl = null;
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                logger.error(`Error fetching Google jobs: ${error}`);
                break;
            }
        }

        logger.info(`Total Google jobs scraped: ${jobs.length}`);

        try {
            await this.postgresService.storeJobs(jobs);
            logger.info(`Successfully processed Google jobs`);
        } catch (error) {
            logger.error(`Error storing Google jobs: ${error}`);
            throw error;
        }

        await browser.close();
        return jobs;
    }
}