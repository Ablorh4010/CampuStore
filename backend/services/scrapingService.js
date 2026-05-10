const puppeteer = require('puppeteer');
const { query } = require('../config/database');

const scrapeLinkedInJobs = async (searchQuery = 'internship') => {
  let browser;
  try {
    console.log('🔍 Starting LinkedIn job scraping...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(searchQuery)}&location=Ghana`;
    
    console.log(`📍 Scraping: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    const jobData = await page.evaluate(() => {
      const cards = document.querySelectorAll('.base-card');
      return Array.from(cards).map((card) => ({
        title: card.querySelector('.base-search-card__title')?.textContent?.trim() || '',
        company: card.querySelector('.base-search-card__subtitle')?.textContent?.trim() || '',
        link: card.querySelector('a.base-card__full-link')?.href || '',
      }));
    });

    const validJobs = jobData.filter((job) => job.title && job.company);
    console.log(`✅ Found ${validJobs.length} jobs`);

    return { success: true, jobsFound: validJobs.length, jobs: validJobs };
  } catch (error) {
    console.error('❌ Scraping error:', error.message);
    return { success: false, jobsFound: 0, error: error.message };
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = { scrapeLinkedInJobs };
