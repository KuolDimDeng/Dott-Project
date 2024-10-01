import logging
from .modules.irs_scraper import scrape_federal_tax_data
# from .modules.fred_api import fetch_fred_data
# from .modules.state_tax_fetcher import fetch_state_tax_api, scrape_state_tax_data
from ..utils.data_manager import load_cached_data, cache_data

logger = logging.getLogger(__name__)

def update_tax_data():
    try:
        federal_data = scrape_federal_tax_data()
        if federal_data:
            return "Tax data updated successfully"
        else:
            return "Failed to update tax data"
    except Exception as e:
        logger.error(f"Error updating tax data: {str(e)}")
        return f"Error updating tax data: {str(e)}"

def get_federal_tax_data():
    return load_cached_data('federal_tax_data.json')

def get_state_tax_data(state):
    return load_cached_data(f'{state}_tax_data.json')

def get_fred_data(series_id):
    return load_cached_data(f'{series_id}.json')
