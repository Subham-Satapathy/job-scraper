import { CronJob } from 'cron';
import { MicrosoftScraper } from './scrapers/microsoft';
import { GoogleScraper } from './scrapers/google';
import { AmazonScraper } from './scrapers/amazon';
import logger from './utils/logger';

const scrapers = [
    new MicrosoftScraper(),
    new GoogleScraper(),
    new AmazonScraper()
];

export const startScheduler = async () => {
    new CronJob('* * * * *', async () => { // Runs every hour
        logger.info('Starting job scraping...');
        await Promise.all(scrapers.map(async (scraper) => {
            await scraper.scrape();
        }));
    }, null, true);
};
