import os
import json
import logging
import requests
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed
from ratelimit import limits, sleep_and_retry
from datetime import datetime
import threading

write_lock = threading.Lock()

# Logging setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Define the path for saving state tax data
DATA_PATH = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/data/state_tax_data.json'

# Ensure the directory exists
os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)

# Load state tax configuration (URLs, settings)
config_path = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/modules/state_tax_config.json'

# Load state tax configuration
try:
    with open(config_path, 'r') as config_file:
        STATE_CONFIG = json.load(config_file)
    logger.info("State tax configuration successfully loaded.")
except FileNotFoundError:
    logger.error(f"Configuration file not found at {config_path}")
    STATE_CONFIG = {}
except Exception as e:
    logger.error(f"An error occurred while loading the configuration: {e}")
    STATE_CONFIG = {}

@sleep_and_retry
@limits(calls=1, period=5)  # Rate limit: 1 call per 5 seconds
def rate_limited_get(url):
    logger.info(f"Sending request to {url}")
    try:
        response = requests.get(url)
        response.raise_for_status()
        logger.info(f"Response status code: {response.status_code}")
        return response
    except requests.RequestException as e:
        logger.error(f"Failed to fetch data from {url}: {e}")
        return None

def save_cached_data(state, data):
    cache_file = os.path.join(os.path.dirname(DATA_PATH), f"{state.lower().replace(' ', '_')}_cache.json")
    logger.info(f"Caching data for {state} to {cache_file}")
    try:
        with open(cache_file, 'w') as f:
            json.dump({'timestamp': datetime.now().isoformat(), 'data': data}, f)
    except Exception as e:
        logger.error(f"Error saving cache for {state}: {e}")

def fetch_california_tax_data():
    config = STATE_CONFIG.get('California', {})
    if not config:
        logger.error("No configuration found for California")
        return None

    response = rate_limited_get(config['url'])
    if response:
        try:
            soup = BeautifulSoup(response.content, 'html.parser')
            tax_table = soup.find('table')  # Adjust based on actual HTML structure
            if not tax_table:
                logger.error("Failed to find the California tax table.")
                return None
            tax_data = parse_html_table(tax_table)
            data = {"state": "California", "tax_info": tax_data}
            logger.info(f"Fetched California tax data: {data}")
            save_cached_data('California', data)
            return data
        except Exception as e:
            logger.error(f"Failed to parse California tax data: {e}")
            return None
    else:
        logger.error("No response received from California URL.")
        return None

def scrape_new_york_tax_data():
    config = STATE_CONFIG.get('New York', {})
    if not config:
        logger.error("No configuration found for New York")
        return None

    response = rate_limited_get(config['url'])
    if response:
        soup = BeautifulSoup(response.content, 'html.parser')
        tax_table = soup.find('table', {'class': 'tax-table'})  # Adjust based on actual HTML structure
        if not tax_table:
            logger.error("Failed to find the tax table on the New York tax page.")
            return None
        
        rows = tax_table.find_all('tr')[1:]  # Skip header row
        tax_data = []
        for row in rows:
            cols = row.find_all('td')
            if len(cols) == 3:
                lower_bound = float(cols[0].text.replace('$', '').replace(',', ''))
                upper_bound = float(cols[1].text.replace('$', '').replace(',', ''))
                rate = float(cols[2].text.replace('%', '')) / 100
                tax_data.append((lower_bound, upper_bound, rate))
        
        data = {"state": "New York", "income_brackets": tax_data}
        logger.info(f"Fetched New York tax data: {data}")
        save_cached_data('New York', data)
        return data
    else:
        logger.error("No response received from New York URL.")
        return None

def fetch_utah_tax_data():
    config = STATE_CONFIG.get('Utah', {})
    if not config:
        logger.error("No configuration found for Utah")
        return None

    response = rate_limited_get(config['url'])
    if response:
        soup = BeautifulSoup(response.content, 'html.parser')
        
        tax_section = soup.find(string="Utah has a single tax rate for all income levels, as follows:")
        if not tax_section:
            logger.error("Failed to find the Utah tax rate section on the page.")
            return None

        table = tax_section.find_next("table")
        if not table:
            logger.error("No table found with tax rate data.")
            return None

        rows = table.find_all("tr")
        tax_data = []
        for row in rows[1:]:  # Skip the header row
            cols = row.find_all("td")
            if len(cols) == 2:
                date_range = cols[0].text.strip()
                tax_rate = cols[1].text.strip()
                tax_data.append({"date_range": date_range, "tax_rate": tax_rate})

        data = {"state": "Utah", "tax_info": tax_data}
        logger.info(f"Fetched Utah tax data: {data}")
        save_cached_data('Utah', data)
        return data
    else:
        logger.error("No response received from Utah URL.")
        return None
    

def save_state_tax_data(state, data):
    with write_lock:
        if os.path.exists(DATA_PATH):
            try:
                with open(DATA_PATH, 'r') as f:
                    state_data_list = json.load(f)
                    if not isinstance(state_data_list, list):
                        logger.warning(f"Existing data in {DATA_PATH} is not a list, resetting data.")
                        state_data_list = []
            except json.JSONDecodeError:
                logger.warning(f"Existing data file {DATA_PATH} is empty or corrupted, creating a new list.")
                state_data_list = []
        else:
            state_data_list = []

        if data:
            logger.info(f"Appending tax data for {state}: {data}")
            state_data_list.append(data)
        else:
            logger.warning(f"No data to save for {state}. Data is empty or None.")

        try:
            with open(DATA_PATH, 'w') as outfile:
                json.dump(state_data_list, outfile, indent=2)
            logger.info(f"Tax data for {state} appended to {DATA_PATH}.")
        except Exception as e:
            logger.error(f"Failed to save data for {state}: {e}")

def process_state(state):
    if state == "Utah":
        return fetch_utah_tax_data()
    elif state == "California":
        return fetch_california_tax_data()
    elif state == "New York":
        return scrape_new_york_tax_data()
    else:
        logger.info(f"Using dummy data for {state}.")
        dummy_data = {"state": state, "tax_info": "dummy_data_for_testing"}
        save_state_tax_data(state, dummy_data)

def parse_html_table(table):
    if not table:
        return "Table not found on the page."

    rows = table.find_all('tr')
    tax_data = []
    for row in rows[1:]:  # Skip the header row
        cols = row.find_all('td')
        if len(cols) == 3:  # Assuming tax tables with 3 columns (e.g., income range, rate)
            lower_bound = cols[0].text.strip()
            upper_bound = cols[1].text.strip()
            rate = cols[2].text.strip()
            tax_data.append({
                "lower_bound": lower_bound,
                "upper_bound": upper_bound,
                "rate": rate
            })
    return tax_data

def main():
    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_state = {executor.submit(process_state, state): state for state in STATE_CONFIG.keys()}
        for future in as_completed(future_to_state):
            state = future_to_state[future]
            try:
                future.result()
                logger.info(f"Successfully processed {state}")
            except Exception as exc:
                logger.error(f'{state} generated an exception: {exc}')

if __name__ == "__main__":
    main()
