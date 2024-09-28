import os
import re

import json
import logging
import PyPDF2
from bs4 import BeautifulSoup
import requests
from ratelimit import limits, sleep_and_retry
import threading
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser
from datetime import datetime
import pdfplumber
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import certifi  # Add this to the imports

import time

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Define paths
DATA_PATH = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/data/state_tax_data.json'
CONFIG_PATH = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/modules/state_tax_config.json'
MANUAL_DATA_PATH = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/data/manual_state_data.json'
CALIFORNIA_PDF_PATH = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/data/pdf/2023-540-taxtable.pdf'
GEORGIA_PDF_PATH = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/data/pdf/2023 Georgia Tax Rate Schedule.pdf'


# Ensure the data directory exists
os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)

write_lock = threading.Lock()

# Load configurations and manual data
def load_json_file(file_path, default_value={}):
    try:
        with open(file_path, 'r') as file:
            return json.load(file)
    except FileNotFoundError:
        logger.warning(f"File not found at {file_path}")
    except json.JSONDecodeError:
        logger.error(f"Error decoding JSON from {file_path}")
    except Exception as e:
        logger.error(f"An error occurred while loading {file_path}: {e}")
    return default_value

STATE_CONFIG = load_json_file(CONFIG_PATH)
MANUAL_STATE_DATA = load_json_file(MANUAL_DATA_PATH)

def check_robots_txt(url):
    if not url:
        return False
    try:
        parsed_url = urlparse(url)
        if not parsed_url.scheme or not parsed_url.netloc:
            return False
        base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
        rp = RobotFileParser()
        rp.set_url(f"{base_url}/robots.txt")
        rp.read()
        return rp.can_fetch("*", url)
    except Exception as e:
        logger.error(f"Error checking robots.txt for {url}: {e}")
        return False

@sleep_and_retry
@limits(calls=1, period=5)
def rate_limited_get(url):
    logger.info(f"Sending request to {url}")
    try:
        response = requests.get(url, verify=certifi.where())  # Use certifi for SSL verification
        response.raise_for_status()
        logger.info(f"Response status code: {response.status_code}")
        return response
    except requests.RequestException as e:
        logger.error(f"Failed to fetch data from {url}: {e}")
        return None


def get_manual_state_data(state):
    if state in MANUAL_STATE_DATA:
        logger.info(f"Using manual data for {state}")
        return {
            "state": state,
            "tax_info": MANUAL_STATE_DATA[state],
            "source": "Manual input from file"
        }
    else:
        logger.warning(f"No manual data available for {state}")
        return None

def fetch_alabama_tax_data(response):
    soup = BeautifulSoup(response.content, 'html.parser')
    
    tax_data = {
        "state": "Alabama",
        "tax_info": []
    }

    # Look for the tax rate information
    rate_section = soup.find(['h2', 'h3', 'h4'], string=lambda text: 'rate' in text.lower() if text else False)
    if rate_section:
        next_element = rate_section.find_next_sibling()
        while next_element and next_element.name in ['p', 'ul', 'ol']:
            if next_element.name == 'p':
                tax_data["tax_info"].append(next_element.text.strip())
            elif next_element.name in ['ul', 'ol']:
                for li in next_element.find_all('li'):
                    tax_data["tax_info"].append(li.text.strip())
            next_element = next_element.find_next_sibling()

    if not tax_data["tax_info"]:
        # If no specific rate section found, look for any paragraph containing tax rate information
        paragraphs = soup.find_all('p')
        for p in paragraphs:
            if 'tax rate' in p.text.lower() or 'income tax' in p.text.lower():
                tax_data["tax_info"].append(p.text.strip())

    if not tax_data["tax_info"]:
        logger.warning("No tax data found for Alabama")
        return None

    return tax_data

def fetch_california_tax_data():
    logger.info("Fetching California tax data from PDF")
    
    if not os.path.exists(CALIFORNIA_PDF_PATH):
        logger.error(f"California PDF file not found at {CALIFORNIA_PDF_PATH}")
        return None

    tax_data = {
        "state": "California",
        "year": 2023,
        "tax_brackets": []
    }

    try:
        with pdfplumber.open(CALIFORNIA_PDF_PATH) as pdf:
            for page_num, page in enumerate(pdf.pages):
                text = page.extract_text()
                logger.info(f"Parsing page {page_num + 1}")
                parse_california_tax_table(text, tax_data)
        
        if not tax_data["tax_brackets"]:
            logger.error("No tax brackets extracted from California PDF")
            return None
        
        logger.info(f"Extracted {len(tax_data['tax_brackets'])} tax brackets for California")
        return tax_data
    except Exception as e:
        logger.error(f"Error processing California PDF: {e}")
        return None

def parse_california_tax_table(text, tax_data):
    lines = text.split('\n')
    current_status = None
    for line in lines:
        if "Single" in line:
            current_status = "single"
        elif "Married Filing Joint" in line:
            current_status = "married_filing_joint"
        elif "Head of Household" in line:
            current_status = "head_of_household"

        # Ensure current_status is passed to parse_tax_line
        if current_status and line.strip():
            parsed_line = parse_tax_line(line, current_status)
            if parsed_line:
                tax_data["tax_brackets"].append(parsed_line)
                logger.debug(f"Parsed bracket: {parsed_line}")


def parse_tax_line(line):
    parts = line.split()
    if len(parts) >= 7:
        try:
            return {
                "income_range": f"{parts[0]}-{parts[2]}",
                "tax_rate": parts[3],
                "single": parts[4],
                "joint": parts[5],
                "hoh": parts[6]
            }
        except Exception as e:
            logger.error(f"Error parsing tax line: {line}, Error: {e}")
    return None

def fetch_utah_tax_data(response):
    soup = BeautifulSoup(response.content, 'html.parser')
    
    tax_data = {
        "state": "Utah",
        "tax_info": []
    }

    # Look for the tax rate information
    tax_section = soup.find(string=lambda text: "Utah has a single tax rate" in text if text else False)
    if tax_section:
        table = tax_section.find_next("table")
        if table:
            rows = table.find_all("tr")
            for row in rows[1:]:  # Skip header row
                cols = row.find_all("td")
                if len(cols) == 2:
                    date_range = cols[0].text.strip()
                    tax_rate = cols[1].text.strip()
                    tax_data["tax_info"].append({
                        "date_range": date_range,
                        "tax_rate": tax_rate
                    })
    
    if not tax_data["tax_info"]:
        logger.warning("No tax data found for Utah")
        return None

    return tax_data

# Update the fetch_colorado_tax_data function to use Selenium
# Function for fetching Colorado tax data using Selenium and Firefoxdef fetch_colorado_tax_data_with_firefox():
def fetch_colorado_tax_data_with_selenium():
    tax_data = {
        "state": "Colorado",
        "tax_info": []
    }

    try:
        logger.info("Setting up Selenium WebDriver for Colorado")
        service = Service("/usr/local/bin/geckodriver")
        options = Options()
        options.add_argument("--headless")
        driver = webdriver.Firefox(service=service, options=options)
        
        logger.info("Navigating to Colorado tax FAQ page")
        driver.get("https://tax.colorado.gov/individual-income-tax-FAQ")
        
        # Wait for the page to load
        WebDriverWait(driver, 30).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        logger.info("Page loaded successfully")

        # Method 1: Try to find the specific element by XPath
        try:
            element_xpath = "//div[@class='field field--name-field-card-body field--type-text-long field--label-hidden field--item']"
            element = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.XPATH, element_xpath))
            )
            tax_info = element.text
            logger.info("Method 1 (XPath) succeeded")
        except Exception as e:
            logger.warning(f"Method 1 (XPath) failed: {str(e)}")
            tax_info = ""

        # Method 2: Try to find the element by class name
        if not tax_info:
            try:
                element = driver.find_element(By.CLASS_NAME, "field--name-field-card-body")
                tax_info = element.text
                logger.info("Method 2 (Class Name) succeeded")
            except Exception as e:
                logger.warning(f"Method 2 (Class Name) failed: {str(e)}")

        # Method 3: Try to find the element by ID of the accordion
        if not tax_info:
            try:
                accordion = driver.find_element(By.ID, "collapse-accordion-13151-1")
                tax_info = accordion.text
                logger.info("Method 3 (Accordion ID) succeeded")
            except Exception as e:
                logger.warning(f"Method 3 (Accordion ID) failed: {str(e)}")

        # Method 4: Search for keywords in the entire page source
        if not tax_info:
            try:
                page_source = driver.page_source
                soup = BeautifulSoup(page_source, 'html.parser')
                paragraphs = soup.find_all('p')
                for p in paragraphs:
                    if 'income tax rate' in p.text.lower():
                        tax_info += p.text + "\n"
                logger.info("Method 4 (BeautifulSoup) succeeded")
            except Exception as e:
                logger.warning(f"Method 4 (BeautifulSoup) failed: {str(e)}")

        logger.info("Closing WebDriver")
        driver.quit()

        if tax_info:
            # Process the extracted text
            relevant_info = extract_tax_related_info(tax_info)
            tax_data["tax_info"] = relevant_info
            logger.info(f"Extracted tax info: {relevant_info}")
        else:
            logger.warning("No tax data found for Colorado")
            return None
        
        logger.info(f"Returning tax data for Colorado: {tax_data}")
        return tax_data

    except Exception as e:
        logger.error(f"An unexpected error occurred: {str(e)}")
        if 'driver' in locals():
            driver.quit()
        return None

def extract_tax_related_info(text):
    relevant_info = []
    lines = text.split('\n')
    for line in lines:
        if any(keyword in line.lower() for keyword in ['income tax rate', 'proposition', 'tabor']):
            relevant_info.append(line.strip())
    return relevant_info



# Generic function to scrape tax data
def generic_state_tax_scraper(response, state):
    soup = BeautifulSoup(response.content, 'html.parser')
    tax_data = {
        "state": state,
        "tax_info": []
    }

    # Look for headers that might contain tax information
    headers = soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
    for header in headers:
        if any(keyword in header.text.lower() for keyword in ['tax', 'rate', 'income', 'filing']):
            next_element = header.find_next_sibling()
            while next_element and next_element.name not in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                if next_element.name in ['p', 'ul', 'ol', 'table']:
                    tax_data["tax_info"].append(next_element.get_text(strip=True, separator=' '))
                next_element = next_element.find_next_sibling()

    return tax_data if tax_data["tax_info"] else None


# Function to fetch state tax data
def fetch_state_tax_data(state):
    config = STATE_CONFIG.get(state, {})
    if not config:
        logger.error(f"No configuration found for {state}")
        return None

    if not config.get('has_income_tax', True):
        logger.info(f"{state} does not have income tax. Skipping.")
        return None

    url = config.get('url')
    if not url:
        logger.warning(f"No URL provided for {state}")
        return get_manual_state_data(state)

    if not check_robots_txt(url):
        logger.warning(f"Access to {url} is not allowed by robots.txt or URL is invalid.")
        logger.info(f"Please manually enter tax data for {state} in the manual_state_data.json file.")
        return get_manual_state_data(state)

    response = rate_limited_get(url)
    if not response:
        logger.error(f"No response received from {state} URL.")
        return get_manual_state_data(state)

    # Depending on the state, process the data
    if state == "Utah":
        state_data = fetch_utah_tax_data(response)
    elif state == "Alabama":
        state_data = fetch_alabama_tax_data(response)
    elif state == "Colorado":
        state_data = fetch_colorado_tax_data_with_selenium()  # No argument passed here now
    else:
        state_data = generic_state_tax_scraper(response, state)

    # Validate if meaningful data has been pulled
    if not state_data or not state_data.get("tax_info"):
        logger.error(f"Failed to fetch {state} tax data or tax info is missing.")
        return None
    
    # Additional validation logic (if any more fields are critical)
    elif state == "California":
        state_data = fetch_california_tax_data()
        if state_data and state_data.get("tax_brackets"):
            return state_data
        else:
            logger.error("Failed to fetch California tax data.")
            return None

    return state_data

def fetch_connecticut_tax_data():
    logger.info("Fetching Connecticut tax data from the local PDF")
    
    CONNECTICUT_PDF_PATH = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/data/pdf/2022-R-0108.pdf'

    # Ensure the PDF exists before attempting to process it
    if not os.path.exists(CONNECTICUT_PDF_PATH):
        logger.error(f"Connecticut PDF file not found at {CONNECTICUT_PDF_PATH}")
        return None

    tax_data = {
        "state": "Connecticut",
        "year": 2022,
        "tax_brackets": []
    }

    try:
        # Method 1: Using PyPDF2 to extract text from the PDF
        with open(CONNECTICUT_PDF_PATH, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page in reader.pages:
                text += page.extract_text()

        # Method 2: If you prefer using pdfplumber for more detailed parsing
        if not tax_data["tax_brackets"]:
            with pdfplumber.open(CONNECTICUT_PDF_PATH) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    parse_connecticut_tax_table(text, tax_data)

        # Check if tax data was successfully parsed
        if not tax_data["tax_brackets"]:
            logger.error("No tax brackets extracted from Connecticut PDF")
            return None
        
        logger.info(f"Extracted {len(tax_data['tax_brackets'])} tax brackets for Connecticut")
        return tax_data
    except Exception as e:
        logger.error(f"Error processing Connecticut PDF: {e}")
        return None

def parse_connecticut_tax_table(text, tax_data):
    lines = text.split('\n')
    for line in lines:
        logger.debug(f"Processing line: {line}")
        
        # Check if the line contains "Tax Rate" or "Connecticut Taxable Income" and ignore header lines
        if "Tax Rate" in line and "Connecticut Taxable Income" in line:
            logger.info("Found header, skipping this line.")
            continue
        
        # Check for valid tax rate lines (e.g., starts with tax rate percentages)
        if line.startswith(("3%", "5%", "5.5%", "6%", "6.5%", "6.9%", "6.99%")):
            parts = line.split()
            if len(parts) < 7:
                logger.warning(f"Line does not have enough parts to parse: {line}")
                continue  # Skip lines that don't have enough elements
            
            try:
                tax_data["tax_brackets"].append({
                    "tax_rate": parts[0],
                    "single_and_married_filing_separately": f"{parts[1]} to {parts[3]}",
                    "heads_of_household": f"{parts[4]} to {parts[6]}",
                    "married_filing_jointly": f"{parts[7]} to {parts[9]}" if len(parts) > 9 else parts[7]
                })
                logger.debug(f"Added tax bracket: {tax_data['tax_brackets'][-1]}")
            except IndexError as e:
                logger.error(f"IndexError while parsing line: {line} - Error: {e}")
            except Exception as e:
                logger.error(f"Unexpected error while parsing line: {line} - Error: {e}")


def fetch_delaware_tax_data():
    logger.info("Fetching Delaware tax data from the provided URL")
    url = "https://revenue.delaware.gov/software-developer/tax-rate-changes/"

    # Send the request
    response = rate_limited_get(url)
    if not response:
        logger.error("Failed to fetch Delaware tax data.")
        return None

    # Parse the response with BeautifulSoup
    soup = BeautifulSoup(response.content, 'html.parser')

    tax_data = {
        "state": "Delaware",
        "tax_info": []
    }

    # Find the tax table by locating the appropriate section in the HTML
    try:
        # Look for a section with the tax table content
        table_section = soup.find('table')
        if not table_section:
            logger.error("Failed to locate the Delaware tax table in the page.")
            return None

        rows = table_section.find_all('tr')
        for row in rows[1:]:  # Skip the header row
            cols = row.find_all('td')
            if len(cols) >= 4:  # Expecting at least 4 columns per row
                taxable_range = {
                    "income_range": f"{cols[0].text.strip()}-{cols[1].text.strip() if cols[1].text.strip() else 'and above'}",
                    "base_tax": cols[2].text.strip(),
                    "rate": cols[3].text.strip(),
                }
                tax_data["tax_info"].append(taxable_range)

        # Add example calculations if relevant
        tax_data["calculation_examples"] = [
            {
                "income": "$12,345",
                "calculation": "261 + (.048 * (12,345 - 10,000)) = 374"
            },
            {
                "income": "$75,000",
                "calculation": "2943.50 + (.066 * (75,000 - 60,000)) = 3934"
            }
        ]

        if not tax_data["tax_info"]:
            logger.error("No tax data was extracted from the Delaware page.")
            return None

        logger.info(f"Successfully fetched Delaware tax data with {len(tax_data['tax_info'])} entries.")
        return tax_data

    except Exception as e:
        logger.error(f"Error processing Delaware tax data: {e}")
        return None

def fetch_georgia_tax_data():
    """
    Function to extract Georgia tax data from the provided PDF and structure it into a list of dictionaries.
    """
    logger = logging.getLogger(__name__)

    if not os.path.exists(GEORGIA_PDF_PATH):
        logger.error(f"Georgia PDF file not found at {GEORGIA_PDF_PATH}")
        return None

    tax_data = {
        "state": "Georgia",
        "year": 2023,
        "tax_brackets": []
    }

    try:
        with pdfplumber.open(GEORGIA_PDF_PATH) as pdf:
            for page_num, page in enumerate(pdf.pages):
                text = page.extract_text()
                logger.info(f"Parsing page {page_num + 1}")
                parse_georgia_tax_table(text, tax_data)
        
        if not tax_data["tax_brackets"]:
            logger.error("No tax brackets extracted from Georgia PDF")
            return None
        
        logger.info(f"Extracted {len(tax_data['tax_brackets'])} tax brackets for Georgia")
        return tax_data
    except Exception as e:
        logger.error(f"Error processing Georgia PDF: {e}")
        return None

def parse_georgia_tax_table(text, tax_data):
    logger = logging.getLogger(__name__)
    lines = text.split('\n')
    current_status = None

    # Define regex pattern for income range and tax rate
    pattern = re.compile(r'(\$\d{1,3}(,\d{3})?)-\$(\d{1,3}(,\d{3})?)\s+(\d+)%\sof\staxable\s(income|amount\s(over\s\$\d{1,3}(,\d{3})?))')

    for line in lines:
        # Check for filing status
        if "Single" in line:
            current_status = "single"
        elif "Married Filing Joint" in line:
            current_status = "married_filing_joint"
        elif "Head of Household" in line:
            current_status = "head_of_household"

        # Search for income range and tax information
        match = pattern.search(line)
        if match and current_status:
            income_range = f"{match.group(1)}-{match.group(3)}"
            tax_rate = float(match.group(5)) / 100  # Convert percentage to decimal
            extra_info = match.group(6)

            tax_data['tax_brackets'].append({
                "filing_status": current_status,
                "income_range": income_range,
                "tax_rate": tax_rate,
                "extra_info": extra_info
            })
        else:
            logger.debug(f"Line not matched: {line}")




def parse_tax_line(line, status):
    """
    Parse a single line from the PDF and extract tax bracket information.
    
    :param line: The line of text to parse.
    :param status: The filing status to which this tax bracket applies.
    :return: Parsed tax data as a dictionary.
    """
    parts = line.split()

    # Expecting a line with proper ranges and percentages (e.g. "$0 $750 1%")
    if len(parts) >= 5:
        try:
            income_range = f"{parts[0]}-{parts[2]}"
            base_tax = float(parts[3].replace('$', '').replace(',', '')) if '$' in parts[3] else 0.0
            rate = float(parts[4].replace('%', '')) / 100  # Convert percentage to decimal

            return {
                "filing_status": status,
                "income_range": income_range,
                "base_tax": base_tax,
                "rate": rate,
                "extra_info": ' '.join(parts[5:])  # Additional information like "Plus X% of the amount over Y"
            }
        except Exception as e:
            logging.error(f"Error parsing line: {line}, Error: {e}")
    
    return None

# Example: Update the tax calculation logic to use Georgia's rate schedule
def calculate_georgia_tax(income, filing_status):
    """
    Calculate the Georgia tax based on the tax brackets and filing status.
    
    :param income: The taxable income.
    :param filing_status: The filing status ('single', 'married_filing_joint', 'head_of_household', 'married_filing_separate').
    :return: Calculated tax amount.
    """
    if filing_status == "single":
        tax_brackets = [
            (0, 750, 0.01, 0),              # 1% of taxable income
            (750, 2250, 0.02, 8),            # $8.00 plus 2% of amount over $750
            (2250, 3750, 0.03, 38),          # $38.00 plus 3% of amount over $2,250
            (3750, 5250, 0.04, 83),          # $83.00 plus 4% of amount over $3,750
            (5250, 7000, 0.05, 143),         # $143.00 plus 5% of amount over $5,250
            (7000, float('inf'), 0.0575, 230) # $230.00 plus 5.75% of amount over $7,000
        ]
    elif filing_status == "married_filing_joint" or filing_status == "head_of_household":
        tax_brackets = [
            (0, 1000, 0.01, 0),              # 1% of taxable income
            (1000, 3000, 0.02, 10),          # $10.00 plus 2% of amount over $1,000
            (3000, 5000, 0.03, 50),          # $50.00 plus 3% of amount over $3,000
            (5000, 7000, 0.04, 110),         # $110.00 plus 4% of amount over $5,000
            (7000, 10000, 0.05, 190),        # $190.00 plus 5% of amount over $7,000
            (10000, float('inf'), 0.0575, 340) # $340.00 plus 5.75% of amount over $10,000
        ]
    elif filing_status == "married_filing_separate":
        tax_brackets = [
            (0, 500, 0.01, 0),               # 1% of taxable income
            (500, 1500, 0.02, 5),            # $5.00 plus 2% of amount over $500
            (1500, 2500, 0.03, 25),          # $25.00 plus 3% of amount over $1,500
            (2500, 3500, 0.04, 55),          # $55.00 plus 4% of amount over $2,500
            (3500, 5000, 0.05, 95),          # $95.00 plus 5% of amount over $3,500
            (5000, float('inf'), 0.0575, 170) # $170.00 plus 5.75% of amount over $5,000
        ]
    else:
        raise ValueError("Invalid filing status. Must be 'single', 'married_filing_joint', 'head_of_household', or 'married_filing_separate'.")

    # Calculate the tax based on the appropriate bracket
    for lower, upper, rate, fixed_amount in tax_brackets:
        if lower < income <= upper:
            tax = fixed_amount + (income - lower) * rate
            return round(tax, 2)

    # Return 0 if no bracket matches (shouldn't happen)
    return 0.0



# Function to save data and mark as failed if there's no data
def save_state_tax_data(state, data):
    with write_lock:
        state_data_dict = load_json_file(DATA_PATH)
        
        if data and (data.get("tax_info") or data.get("tax_brackets")):  # Check for both tax_info and tax_brackets
            timestamp = datetime.now().isoformat()
            state_data_dict[state] = {
                "timestamp": timestamp,
                "data": data,
                "source": "PDF parsing" if state == "California" else data.get("source", "Web scraping")
            }
            logger.info(f"Updated tax data for {state}")
        else:
            logger.warning(f"Failed to save data for {state}. Tax info is missing or incomplete.")
            return  # Avoid saving incomplete data

        try:
            with open(DATA_PATH, 'w') as outfile:
                json.dump(state_data_dict, outfile, indent=2)
            logger.info(f"Tax data for {state} saved to {DATA_PATH}.")
        except Exception as e:
            logger.error(f"Failed to save data for {state}: {e}")

# Main function that processes states and marks failures
def main():
    states_to_process = ["Alabama", "Arizona", "Utah", "California", "Colorado", "Connecticut", "Delaware", "Georgia"]
    successful_states = []
    failed_states = []
    manual_data_states = []

    for state in states_to_process:
        logger.info(f"Attempting to fetch tax data for {state}")
        
        try:
            if state == "California":
                state_data = fetch_california_tax_data()
            elif state == "Colorado":
                state_data = fetch_colorado_tax_data_with_selenium()
            elif state == "Connecticut":
                state_data = fetch_connecticut_tax_data()
           
            elif state == "Delaware":
                state_data = fetch_delaware_tax_data()
            elif state == "Colorado":
                state_data = fetch_colorado_tax_data_with_selenium()
                
            elif state == "Georgia":
                state_data = fetch_georgia_tax_data()
  
            else:
                state_data = fetch_state_tax_data(state)

            
            # Check if valid data was fetched
            if state_data and (state_data.get("tax_info") or state_data.get("tax_brackets")):
                logger.info(f"Successfully fetched tax data for {state}")
                print(json.dumps(state_data, indent=2))
                save_state_tax_data(state, state_data)
                successful_states.append(state)
                if state_data.get("source") == "Manual input from file":
                    manual_data_states.append(state)
            else:
                logger.error(f"Failed to fetch tax data for {state}.")
                failed_states.append(state)
        
        except Exception as e:
            logger.error(f"An unexpected error occurred while processing {state}: {str(e)}")
            failed_states.append(state)
        
        logger.info(f"Completed processing for {state}")
        print("---")  # Separator between states
        
    # Generate summary report
    print("\nSummary Report:")
    print(f"Total states processed: {len(states_to_process)}")
    print(f"Successful updates: {len(successful_states)} out of {len(states_to_process)}")
    print(f"Failed updates: {len(failed_states)} out of {len(states_to_process)}")
    print(f"States using manual data: {len(manual_data_states)} out of {len(states_to_process)}")
    
    if successful_states:
        print("\nSuccessfully updated states:")
        for state in successful_states:
            print(f"- {state}")
    
    if failed_states:
        print("\nFailed states:")
        for state in failed_states:
            print(f"- {state}")
    
    if manual_data_states:
        print("\nStates using manual data:")
        for state in manual_data_states:
            print(f"- {state}")

if __name__ == "__main__":
    main()