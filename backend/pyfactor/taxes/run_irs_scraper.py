import logging
from taxes.modules.irs_scraper import scrape_federal_tax_data

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    logger.info("Running IRS scraper...")
    tax_data = scrape_federal_tax_data()

    if tax_data:
        logger.info(f"Scraped Federal Tax Data: {tax_data}")
    else:
        logger.error("Failed to scrape federal tax data.")
