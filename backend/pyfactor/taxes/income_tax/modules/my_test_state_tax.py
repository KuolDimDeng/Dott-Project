import os
import re
import csv
from tempfile import NamedTemporaryFile
from lxml import etree
import sys
import logging
import os
from io import StringIO
import json
import logging
import PyPDF2
from bs4 import BeautifulSoup
from pdf2image import convert_from_path
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
from io import BytesIO


import time

from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

logger = logging.getLogger(__name__)

# Define paths
# Define paths
DATA_PATH = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/income_tax/data/state_tax_data.json'
CONFIG_PATH = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/income_tax/modules/state_tax_config.json'
MANUAL_DATA_PATH = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/income_tax/data/manual_state_data.json'
CALIFORNIA_PDF_PATH = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/income_tax/data/pdf/2023-540-taxtable.pdf'
GEORGIA_PDF_PATH = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/income_tax/data/pdf/2023 Georgia Tax Rate Schedule.pdf'

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
    logger.info("Fetching California tax data using multiple approaches")
    url = STATE_CONFIG["California"]["url"]

    tax_data = {
        "state": "California",
        "year": 2023,
        "tax_brackets": []
    }

    try:
        # Approach 1: Try to read from local PDF file
        if os.path.exists(CALIFORNIA_PDF_PATH):
            with pdfplumber.open(CALIFORNIA_PDF_PATH) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    parse_california_tax_table(text, tax_data)
        
        # Approach 2: If local file doesn't exist or parsing fails, try web scraping
        if not tax_data["tax_brackets"]:
            response = requests.get(url)
            if response.status_code == 200:
                with pdfplumber.open(BytesIO(response.content)) as pdf:
                    for page in pdf.pages:
                        text = page.extract_text()
                        parse_california_tax_table(text, tax_data)

        if not tax_data["tax_brackets"]:
            logger.error("No tax brackets extracted for California")
            return None
        
        logger.info(f"Extracted {len(tax_data['tax_brackets'])} tax brackets for California")
        return tax_data
    except Exception as e:
        logger.error(f"Error processing California tax data: {e}")
        logger.exception("Full traceback:")
        return None

def parse_california_tax_table_html(table, tax_data):
    rows = table.find_all('tr')[1:]  # Skip header row
    for row in rows:
        cells = row.find_all('td')
        if len(cells) >= 3:
            tax_data["tax_brackets"].append({
                "income_range": cells[0].text.strip(),
                "tax_rate": cells[1].text.strip(),
                "of_amount_over": cells[2].text.strip()
            })

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
    
    CONNECTICUT_PDF_PATH = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/income_tax/data/pdf/2022-R-0108.pdf'
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
    url = STATE_CONFIG["Delaware"]["url"]

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


def fetch_hawaii_tax_data():
    logger.info("Fetching Hawaii tax data from local HTML files")
    
    hawaii_data_dir = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/income_tax/data/Hawaii'
    
    tax_data = {
        "state": "Hawaii",
        "year": 2023,
        "tax_info": []
    }

    # List all HTML files in the Hawaii data directory
    html_files = [f for f in os.listdir(hawaii_data_dir) if f.endswith('.html')]

    for html_file in html_files:
        file_path = os.path.join(hawaii_data_dir, html_file)
        income_range = extract_income_range_from_filename(html_file)
        
        with open(file_path, 'r', encoding='utf-8') as file:
            soup = BeautifulSoup(file, 'html.parser')
            table = soup.find('table')
            if table:
                tax_info = parse_hawaii_tax_table(table, income_range)
                tax_data["tax_info"].extend(tax_info)
            else:
                logger.warning(f"No table found in {html_file}")

    if not tax_data["tax_info"]:
        logger.error("No tax information found for Hawaii")
        return None

    logger.info(f"Extracted tax data for {len(tax_data['tax_info'])} income ranges for Hawaii")
    return tax_data

def extract_income_range_from_filename(filename):
    # Extract income range from the filename
    # Example: "Tax Table For Taxable Years Beginning After December 31, 2017_ $0 to $7,000.html"
    parts = filename.split('_')
    if len(parts) > 1:
        return parts[-1].replace('.html', '').strip()
    return "Unknown Range"

def parse_hawaii_tax_table(table, income_range):
    tax_info = []
    rows = table.find_all('tr')
    for row in rows[2:]:  # Skip header rows
        cols = row.find_all('td')
        if len(cols) >= 5:
            entry = {
                "income_range": income_range,
                "at_least": cols[0].text.strip(),
                "but_less_than": cols[1].text.strip(),
                "single_or_married_filing_separately": cols[2].text.strip(),
                "married_filing_jointly": cols[3].text.strip(),
                "head_of_household": cols[4].text.strip()
            }
            tax_info.append(entry)
    return tax_info

def fetch_idaho_tax_data():
    logger.info("Fetching Idaho tax data")
    url = STATE_CONFIG["Idaho"]["url"]

    tax_data = {
        "state": "Idaho",
        "tax_info": []
    }

    try:
        response = rate_limited_get(url)
        if not response:
            logger.error("Failed to fetch Idaho tax data.")
            return None

        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Look for paragraphs containing the tax rate information
        paragraphs = soup.find_all('p')
        for paragraph in paragraphs:
            if paragraph.text.strip().startswith("The income tax rate for"):
                tax_data["tax_info"].append(paragraph.text.strip())
                logger.info(f"Found Idaho tax rate information: {paragraph.text.strip()}")
                break
        
        if not tax_data["tax_info"]:
            logger.warning("No tax rate information found for Idaho")
            return None

        return tax_data

    except Exception as e:
        logger.error(f"Error processing Idaho tax data: {e}")
        return None
    
def fetch_iowa_tax_data():
    logger.info("Fetching Iowa tax data from local file")
    
    file_path = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/income_tax/data/Iowa/Iowa_tax_data.txt'
    logger.debug(f"Attempting to open file at: {file_path}")
    
    tax_data = {
        "state": "Iowa",
        "single_filer": [],
        "married_filing_jointly": [],
        "note": ""
    }

    try:
        with open(file_path, 'r') as file:
            logger.debug("File opened successfully")
            current_section = None
            csv_reader = None

            for line_num, line in enumerate(file, 1):
                line = line.strip()
                logger.debug(f"Processing line {line_num}: {line}")
                
                if line.startswith('2023-2026 Tax Rates (Single Filers)'):
                    current_section = 'single_filer'
                    logger.debug("Entering single filer section")
                    next(file)  # Skip the header line
                    csv_reader = csv.reader(file)
                elif line.startswith('2023-2026 Tax Rates (Married Filing Jointly)'):
                    current_section = 'married_filing_jointly'
                    logger.debug("Entering married filing jointly section")
                    next(file)  # Skip the header line
                    csv_reader = csv.reader(file)
                elif line.startswith('Note:'):
                    tax_data['note'] = line
                    logger.debug(f"Note added: {line}")
                    break
                elif csv_reader and line:
                    row = next(csv_reader)
                    logger.debug(f"Processing row: {row}")
                    if current_section and len(row) == 6:
                        tax_data[current_section].append({
                            'lower_limit': row[0],
                            'upper_limit': row[1],
                            'TY_2023': row[2],
                            'TY_2024': row[3],
                            'TY_2025': row[4],
                            'TY_2026': row[5]
                        })
                        logger.debug(f"Added tax bracket to {current_section}")
                    else:
                        logger.warning(f"Skipped row due to incorrect format: {row}")

        if not tax_data['single_filer'] or not tax_data['married_filing_jointly']:
            logger.warning("No tax rate information found for Iowa")
            return None

        logger.info(f"Successfully fetched Iowa tax data with {len(tax_data['single_filer'])} brackets for single filers and {len(tax_data['married_filing_jointly'])} brackets for married filing jointly")
        logger.debug(f"Full tax data: {tax_data}")
        return tax_data

    except FileNotFoundError:
        logger.error(f"Iowa tax data file not found at {file_path}")
        return None
    except Exception as e:
        logger.error(f"Error processing Iowa tax data: {e}")
        logger.exception("Full traceback:")
        return None
    
def fetch_illinois_tax_data():
    logger.info("Fetching Illinois tax data")
    url = STATE_CONFIG["Illinois"]["url"]

    tax_data = {
        "state": "Illinois",
        "tax_info": []
    }

    try:
        response = rate_limited_get(url)
        if not response:
            logger.error("Failed to fetch Illinois tax data.")
            return None

        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find the table containing tax rates
        table = soup.find('table')
        if not table:
            logger.warning("Could not find tax rate table for Illinois")
            return None

        # Find the row containing Individual Income Tax information
        rows = table.find_all('tr')
        for row in rows:
            cells = row.find_all('td')
            if len(cells) >= 2 and "Individual Income Tax" in cells[0].get_text():
                tax_info = cells[1].get_text(strip=True)
                
                # Extract the tax rate and effective date
                rate_match = re.search(r'(\d+(?:\.\d+)?)\s*percent', tax_info)
                date_match = re.search(r'Effective\s+([\w\s,]+):', tax_info)
                
                if rate_match and date_match:
                    tax_data["tax_info"].append({
                        "type": "Individual Income Tax",
                        "rate": f"{rate_match.group(1)}%",
                        "effective_date": date_match.group(1).strip(),
                        "details": tax_info
                    })
                else:
                    logger.warning("Could not extract tax rate or effective date for Illinois")
                    tax_data["tax_info"].append({
                        "type": "Individual Income Tax",
                        "details": tax_info
                    })
                
                # Check for prior year rates link in the next cell
                if len(cells) >= 3:
                    prior_year_link = cells[2].find('a')
                    if prior_year_link:
                        tax_data["tax_info"].append({
                            "type": "Prior Year Rates",
                            "link": prior_year_link['href'] if 'href' in prior_year_link.attrs else "Link not found"
                        })
                
                break  # We've found the information we need, so exit the loop

        if not tax_data["tax_info"]:
            logger.warning("No tax data found for Illinois")
            return None

        logger.info(f"Successfully fetched Illinois tax data: {tax_data}")
        return tax_data

    except Exception as e:
        logger.error(f"Error processing Illinois tax data: {e}")
        return None
    
def fetch_indiana_tax_data():
    logger.info("Fetching Indiana tax data")
    url = STATE_CONFIG["Indiana"]["url"]

    tax_data = {
        "state": "Indiana",
        "tax_info": []
    }

    try:
        response = rate_limited_get(url)
        if not response:
            logger.error("Failed to fetch Indiana tax data.")
            return None

        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find the section with Individual Income Tax information
        target_text = "The Indiana Individual adjusted gross income tax rate"
        paragraphs = soup.find_all('p')
        
        for paragraph in paragraphs:
            if target_text in paragraph.get_text():
                tax_info = paragraph.get_text(strip=True)
                
                # Extract the tax rates for 2023 and 2024
                rate_2023 = re.search(r'2023 is (\d+\.\d+)%', tax_info)
                rate_2024 = re.search(r'2024 to (\d+\.\d+)%', tax_info)
                
                if rate_2023:
                    tax_data["tax_info"].append({
                        "year": 2023,
                        "rate": f"{rate_2023.group(1)}%"
                    })
                if rate_2024:
                    tax_data["tax_info"].append({
                        "year": 2024,
                        "rate": f"{rate_2024.group(1)}%"
                    })
                
                # Add the full sentence for context
                tax_data["tax_info"].append({
                    "details": tax_info
                })
                
                break  # We've found the information we need, so exit the loop

        if not tax_data["tax_info"]:
            logger.warning("No tax data found for Indiana")
            return None

        logger.info(f"Successfully fetched Indiana tax data: {tax_data}")
        return tax_data

    except Exception as e:
        logger.error(f"Error processing Indiana tax data: {e}")
        return None


def fetch_kentucky_tax_data():
    logger.info("Fetching Kentucky tax data from manual_state_data.json")
    
    file_path = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/income_tax/data/manual_state_data.json'
    tax_data = {
        "state": "Kentucky",
        "tax_info": []
    }

    try:
        if not os.path.exists(file_path):
            logger.error(f"manual_state_data.json file not found at {file_path}")
            return None

        with open(file_path, 'r', encoding='utf-8') as file:
            manual_data = json.load(file)

        if "Kentucky" in manual_data:
            kentucky_data = manual_data["Kentucky"]
            tax_data["tax_info"].append({
                "rate": kentucky_data["tax_rate"],
                "details": kentucky_data["details"]
            })
        else:
            logger.warning("No Kentucky data found in manual_state_data.json")
            return None

        logger.info(f"Successfully fetched Kentucky tax data: {tax_data}")
        return tax_data

    except Exception as e:
        logger.error(f"Error processing Kentucky tax data: {e}")
        logger.exception("Full traceback:")
        return None
    
    
def fetch_louisiana_tax_data():
    logger.info("Fetching Louisiana tax data")
    url = STATE_CONFIG["Louisiana"]["url"]

    tax_data = {
        "state": "Louisiana",
        "tax_info": []
    }

    try:
        response = rate_limited_get(url)
        if not response:
            logger.error("Failed to fetch Louisiana tax data.")
            return None

        # Parse the HTML content
        html = etree.HTML(response.content)
        
        # Find the table using XPath
        table = html.xpath('/html/body/div[2]/div[1]/article/table')
        
        if not table:
            logger.warning("Could not find tax rate table for Louisiana using XPath")
            return None

        # Convert the element to string and parse with BeautifulSoup for easier handling
        table_html = etree.tostring(table[0])
        soup = BeautifulSoup(table_html, 'html.parser')

        # Extract and parse the tax rate information
        rows = soup.find_all('tr')
        current_filing_status = None
        for row in rows[2:]:  # Skip the header rows
            cells = row.find_all('td')
            if len(cells) >= 4:
                text = cells[0].get_text(strip=True)
                if "Single, married filing separately, or head of household" in text:
                    current_filing_status = "single_separate_hoh"
                elif "Married filing jointly or qualified surviving spouse" in text:
                    current_filing_status = "married_joint_surviving"
                elif current_filing_status:
                    income_range = cells[0].get_text(strip=True)
                    rate_2022 = cells[3].get_text(strip=True)  # Changed from cells[2] to cells[3]
                    tax_data["tax_info"].append({
                        "filing_status": current_filing_status,
                        "income_range": income_range,
                        "tax_rate_2022": rate_2022
                    })

        if not tax_data["tax_info"]:
            logger.warning("No tax data found for Louisiana")
            return None

        logger.info(f"Successfully fetched Louisiana tax data: {tax_data}")
        return tax_data

    except Exception as e:
        logger.error(f"Error processing Louisiana tax data: {e}")
        logger.exception("Full traceback:")
        return None
    
import requests
from bs4 import BeautifulSoup
from lxml import etree

def fetch_maryland_tax_data():
    logger.info("Fetching Maryland tax data")
    url = STATE_CONFIG["Maryland"]["url"]

    tax_data = {
        "state": "Maryland",
        "year": 2023,
        "tax_info": {
            "single_separate_dependent_fiduciary": [],
            "joint_head_of_household_widow": []
        }
    }

    try:
        response = rate_limited_get(url)
        if not response:
            logger.error("Failed to fetch Maryland tax data.")
            return None

        soup = BeautifulSoup(response.content, 'html.parser')

        # Try multiple methods to find the table
        table = None
        
        # Method 1: Look for a table with a specific class
        table = soup.find('table', class_='table')
        
        # Method 2: Look for a table within a div with class 'table-responsive'
        if not table:
            table_div = soup.find('div', class_='table-responsive')
            if table_div:
                table = table_div.find('table')
        
        # Method 3: Look for a table that follows an h2 with "Maryland Income Tax Rates"
        if not table:
            h2 = soup.find('h2', string=lambda text: 'Maryland Income Tax Rates' in text if text else False)
            if h2:
                table = h2.find_next('table')

        if not table:
            logger.warning("Could not find tax rate table for Maryland")
            return None

        # Extract and parse the tax rate information
        rows = table.find_all('tr')
        for row in rows[2:]:  # Skip the header rows
            cells = row.find_all('td')
            if len(cells) == 4:
                # Single, Married Filing Separately, Dependent Taxpayers or Fiduciaries
                tax_data["tax_info"]["single_separate_dependent_fiduciary"].append({
                    "income_range": cells[0].get_text(strip=True),
                    "tax_rate": cells[1].get_text(strip=True)
                })
                
                # Joint Returns, Head of Household, or Qualifying Widows/Widowers
                tax_data["tax_info"]["joint_head_of_household_widow"].append({
                    "income_range": cells[2].get_text(strip=True),
                    "tax_rate": cells[3].get_text(strip=True)
                })

        if not tax_data["tax_info"]["single_separate_dependent_fiduciary"] or not tax_data["tax_info"]["joint_head_of_household_widow"]:
            logger.warning("No tax data found for Maryland")
            return None

        logger.info(f"Successfully fetched Maryland tax data: {tax_data}")
        return tax_data

    except Exception as e:
        logger.error(f"Error processing Maryland tax data: {e}")
        logger.exception("Full traceback:")
        return None
    
def fetch_massachusetts_tax_data():
    logger.info("Fetching Massachusetts tax data")
    url = STATE_CONFIG["Massachusetts"]["url"]

    tax_data = {
        "state": "Massachusetts",
        "year": 2023,
        "tax_info": {
            "rate": "5.0%",
            "details": "5.0% tax on both earned (salaries, wages, tips, commissions) and unearned (interest, dividends, and capital gains) income."
        }
    }

    try:
        response = rate_limited_get(url)
        if not response:
            logger.error("Failed to fetch Massachusetts tax data.")
            return None

        soup = BeautifulSoup(response.content, 'html.parser')

        # Look for the specific text mentioning the tax rate
        target_text = soup.find(string=lambda text: "5.0% tax on both earned" in text if text else False)

        if target_text:
            # If we find the text, update the tax_data with the found information
            tax_data["tax_info"]["details"] = target_text.strip()
            logger.info("Successfully verified Massachusetts tax rate on the webpage")
        else:
            logger.warning("Could not find specific tax rate information on the webpage. Using default values.")

        logger.info(f"Successfully fetched Massachusetts tax data: {tax_data}")
        return tax_data

    except Exception as e:
        logger.error(f"Error processing Massachusetts tax data: {e}")
        logger.exception("Full traceback:")
        return None
    
def fetch_michigan_tax_data():
    logger.info("Fetching Michigan tax data")
    url = STATE_CONFIG["Michigan"]["url"]
    file_path = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/income_tax/data/Michigan/2024 Tax Year Income Tax Rate for Individuals and Fiduciaries.html'

    tax_data = {
        "state": "Michigan",
        "year": 2024,
        "tax_info": {
            "rate": None,
            "details": None
        }
    }

    try:
        # Try to read from local file first
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()
        else:
            # If local file doesn't exist, fetch from URL
            response = requests.get(url)
            content = response.text

        soup = BeautifulSoup(content, 'html.parser')

        # Look for the specific text mentioning the tax rate
        target_text = soup.find(string=lambda text: "4.25%" in text if text else False)

        if target_text:
            tax_data["tax_info"]["rate"] = "4.25%"
            paragraph = target_text.find_parent('p')
            if paragraph:
                tax_data["tax_info"]["details"] = paragraph.text.strip()
            logger.info("Successfully found Michigan tax rate information")
        else:
            logger.warning("Could not find specific tax rate information. Using default values.")

        logger.info(f"Successfully fetched Michigan tax data: {tax_data}")
        return tax_data

    except Exception as e:
        logger.error(f"Error processing Michigan tax data: {e}")
        logger.exception("Full traceback:")
        return None

def parse_tax_table(file_path, categories):
    tax_data = {cat: [] for cat in categories}
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            lines = file.readlines()
        
        for line in lines[2:]:  # Skip the header lines
            parts = line.strip().split()
            if len(parts) >= 5:
                rate = parts[0]
                for i, category in enumerate(categories):
                    tax_data[category].append({
                        "rate": rate,
                        "more_than": parts[1 + i*2].strip('$'),
                        "but_not_more_than": parts[2 + i*2].strip('$​') if parts[2 + i*2] != '' else None
                    })
    except Exception as e:
        logger.error(f"Error parsing file {file_path}: {str(e)}")
    return tax_data

def fetch_minnesota_tax_data():
    logger.info("Fetching Minnesota tax data")
    url = STATE_CONFIG["Minnesota"]["url"]

    tax_data = {
        "state": "Minnesota",
        "year": 2024,
        "tax_info": {}
    }

    try:
        response = requests.get(url)
        soup = BeautifulSoup(response.content, 'html.parser')

        # Find the tax rate table
        table = soup.find('table')
        if table:
            rows = table.find_all('tr')[1:]  # Skip header row
            for row in rows:
                cols = row.find_all('td')
                if len(cols) >= 3:
                    filing_status = cols[0].text.strip()
                    income_range = cols[1].text.strip()
                    rate = cols[2].text.strip()
                    
                    if filing_status not in tax_data["tax_info"]:
                        tax_data["tax_info"][filing_status] = []
                    
                    tax_data["tax_info"][filing_status].append({
                        "income_range": income_range,
                        "rate": rate
                    })

        if not tax_data["tax_info"]:
            logger.warning("No tax data found for Minnesota")
            return None

        logger.info("Successfully fetched Minnesota tax data")
        return tax_data

    except Exception as e:
        logger.error(f"Unexpected error parsing Minnesota tax data: {str(e)}")
        logger.exception("Full traceback:")
        return None
    
def fetch_mississippi_tax_data():
    logger.info("Fetching Mississippi tax data")

    tax_data = {
        "state": "Mississippi",
        "tax_info": []
    }

    url = STATE_CONFIG["Mississippi"]["url"]

    try:
        service = Service("/usr/local/bin/geckodriver")  # Update this path to your geckodriver location
        options = Options()
        options.add_argument("--headless")
        driver = webdriver.Firefox(service=service, options=options)

        driver.get(url)
        
        # Wait for the table to be present
        table = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "/html/body/div[1]/div/div/section/div[2]/article/div/div/div/div/div/div/table[3]"))
        )
        
        rows = table.find_elements(By.TAG_NAME, "tr")
        
        for row in rows:
            cells = row.find_elements(By.TAG_NAME, "td")
            if len(cells) == 2:
                year = cells[0].text.strip().split()[-1]
                rate_info = cells[1].text.strip()
                rate = rate_info.split("@")[-1].strip()
                
                tax_data["tax_info"].append({
                    "year": int(year),
                    "rate": rate,
                    "description": rate_info
                })
        
        logger.info(f"Successfully extracted tax data for Mississippi: {len(tax_data['tax_info'])} years")
        
        driver.quit()

        if tax_data["tax_info"]:
            return tax_data
        else:
            logger.warning("No tax data found for Mississippi")
            return None

    except Exception as e:
        logger.error(f"Unexpected error processing Mississippi tax data: {str(e)}")
        logger.exception("Full traceback:")
        if 'driver' in locals():
            driver.quit()
        return None
    
def fetch_montana_tax_data():
    logger.info("Fetching Montana tax data from local HTML file")

    file_path = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/income_tax/data/Montana/Citizen Knowledge Article View - Citizen.html'

    tax_data = {
        "state": "Montana",
        "year": 2024,
        "tax_info": {
            "single_and_married_filing_separately": {"ordinary_tax_rates": []},
            "married_filing_jointly_and_qualifying_surviving_spouse": {"ordinary_tax_rates": []},
            "head_of_household": {"ordinary_tax_rates": []}
        }
    }

    if not os.path.exists(file_path):
        logger.error(f"Montana tax data file not found at {file_path}")
        return None

    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            soup = BeautifulSoup(file, 'html.parser')

        tables = soup.find_all('table', class_='table table-bordered')

        for table in tables:
            header = table.find('th', class_='text-center info')
            if header:
                category = None
                if "Single and Married Filing Separately" in header.text:
                    category = "single_and_married_filing_separately"
                elif "Married Filing Jointly and Qualifying Surviving Spouse" in header.text:
                    category = "married_filing_jointly_and_qualifying_surviving_spouse"
                elif "Head of Household" in header.text:
                    category = "head_of_household"

                if category:
                    rows = table.find_all('tr')
                    for row in rows:
                        cells = row.find_all('td')
                        if len(cells) >= 3 and cells[0].text.strip().startswith('$'):
                            income_range = f"{cells[0].text.strip()} - {cells[1].text.strip()}"
                            tax_rate = cells[2].text.strip()
                            tax_data["tax_info"][category]["ordinary_tax_rates"].append({
                                "income_range": income_range,
                                "rate": tax_rate
                            })

        for category, data in tax_data["tax_info"].items():
            if data["ordinary_tax_rates"]:
                logger.info(f"Successfully parsed ordinary tax rates for {category}")
            else:
                logger.warning(f"No data found for {category}")

        return tax_data

    except Exception as e:
        logger.error(f"Error processing Montana tax data: {e}")
        logger.exception("Full traceback:")
        return None
    
def parse_ordinary_rates(table):
    rates = []
    rows = table.find_all('tr')[2:]  # Skip header rows
    for row in rows:
        cells = row.find_all('td')
        if len(cells) >= 3:
            rates.append({
                "income_range": f"{cells[0].text.strip()} - {cells[1].text.strip()}",
                "rate": cells[2].text.strip()
            })
    return rates

def fetch_nebraska_tax_data():
    logger.info("Fetching Nebraska tax data")
    url = STATE_CONFIG["Nebraska"]["url"]

    tax_data = {
        "state": "Nebraska",
        "tax_info": {
            "single": [],
            "married_filing_jointly": [],
            "head_of_household": [],
            "married_filing_separately": [],
            "estates_and_trusts": []
        }
    }

    # Approach 1: Using requests and BeautifulSoup
    try:
        response = requests.get(url)
        soup = BeautifulSoup(response.content, 'html.parser')
        table = soup.find('table', class_='table table-condensed table-statutes')
        if table:
            parse_nebraska_tax_table(table, tax_data)
        else:
            logger.warning("Table not found using BeautifulSoup")
    except Exception as e:
        logger.error(f"Error in BeautifulSoup approach: {str(e)}")

    # Approach 2: Using Selenium (only if Approach 1 fails)
    if not any(tax_data["tax_info"].values()):
        try:
            options = Options()
            options.add_argument("--headless")
            driver = webdriver.Firefox(options=options)
            driver.get(url)
            
            WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CLASS_NAME, "table-statutes")))
            
            table = driver.find_element(By.CLASS_NAME, "table-statutes")
            table_html = table.get_attribute('outerHTML')
            soup = BeautifulSoup(table_html, 'html.parser')
            parse_nebraska_tax_table(soup, tax_data)
            
            driver.quit()
        except Exception as e:
            logger.error(f"Error in Selenium approach: {str(e)}")
            if 'driver' in locals():
                driver.quit()

    if any(tax_data["tax_info"].values()):
        logger.info("Successfully fetched Nebraska tax data")
        return tax_data
    else:
        logger.warning("Failed to fetch Nebraska tax data")
        return None

def parse_nebraska_tax_table(table, tax_data):
    rows = table.find_all('tr')[3:]  # Skip header rows
    current_bracket = {}
    for row in rows:
        cells = row.find_all('td')
        if len(cells) == 7:
            bracket_number = cells[0].text.strip()
            if bracket_number:
                # Save the previous bracket if it exists
                if current_bracket:
                    for category, value in current_bracket.items():
                        tax_data["tax_info"][category].append(value)
                current_bracket = {
                    "single": {"bracket": bracket_number, "income_range": cells[1].text.strip(), "rate": ""},
                    "married_filing_jointly": {"bracket": bracket_number, "income_range": cells[2].text.strip(), "rate": ""},
                    "head_of_household": {"bracket": bracket_number, "income_range": cells[3].text.strip(), "rate": ""},
                    "married_filing_separately": {"bracket": bracket_number, "income_range": cells[4].text.strip(), "rate": ""},
                    "estates_and_trusts": {"bracket": bracket_number, "income_range": cells[5].text.strip(), "rate": ""}
                }
            rate = cells[6].text.strip()
            if rate:
                for category in current_bracket:
                    current_bracket[category]["rate"] = rate
        elif len(cells) == 6:
            # This row contains the second part of the income range and the rate
            for i, category in enumerate(["single", "married_filing_jointly", "head_of_household", "married_filing_separately", "estates_and_trusts"]):
                current_bracket[category]["income_range"] += f"-{cells[i].text.strip()}"
            rate = cells[5].text.strip()
            if rate:
                for category in current_bracket:
                    current_bracket[category]["rate"] = rate

    # Save the last bracket
    if current_bracket:
        for category, value in current_bracket.items():
            tax_data["tax_info"][category].append(value)

    # Post-process to combine split ranges
    for category in tax_data["tax_info"]:
        processed_brackets = []
        for bracket in tax_data["tax_info"][category]:
            if '-' in bracket["income_range"] and not bracket["income_range"].endswith('and Over'):
                parts = bracket["income_range"].split('-')
                if len(parts) == 2 and parts[1].strip():
                    bracket["income_range"] = f"{parts[0]}-{parts[1]}"
                else:
                    # Find the next bracket to get the upper limit
                    next_bracket = next((b for b in tax_data["tax_info"][category] if b["bracket"] == str(int(bracket["bracket"]) + 1)), None)
                    if next_bracket:
                        upper_limit = next_bracket["income_range"].split('-')[0]
                        bracket["income_range"] = f"{parts[0]}-{upper_limit}"
            processed_brackets.append(bracket)
        tax_data["tax_info"][category] = processed_brackets

    return tax_data

def fetch_new_jersey_tax_data():
    logger.info("Fetching New Jersey tax data from local PDF file")
    
    pdf_path = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/income_tax/data/pdf/NewJersey.pdf'
    
    tax_data = {
        "state": "New Jersey",
        "year": 2020,
        "tax_info": {
            "single_married_separate": [],
            "married_joint_hoh_qualifying_widower": []
        }
    }

    try:
        with pdfplumber.open(pdf_path) as pdf:
            text = ""
            for page in pdf.pages:
                text += page.extract_text()

        # Split the text into two sections
        sections = text.split("FILING STATUS:")

        # Parse each section
        for i, section in enumerate(sections[1:]):  # Skip the first empty split
            filing_status = "single_married_separate" if i == 0 else "married_joint_hoh_qualifying_widower"
            
            # Extract tax brackets
            brackets = re.findall(r'\$\s*([\d,]+)(?:\s+\$\s*([\d,]+)|and over)', section)
            
            # Extract tax rates
            rates = re.findall(r'\.([\d]+)', section)

            # Extract subtract amounts
            subtracts = re.findall(r'–\s+\$\s*([\d,.]+)\s+=', section)

            # Combine brackets, rates, and subtracts
            for j, (lower, upper) in enumerate(brackets):
                lower = int(lower.replace(',', ''))
                upper = int(upper.replace(',', '')) if upper else float('inf')
                rate = float(f"0.{rates[j]}")
                
                subtract = subtracts[j] if j < len(subtracts) else "N/A"
                
                tax_data["tax_info"][filing_status].append({
                    "income_range": f"${lower:,} - {'$' + f'{upper:,}' if upper != float('inf') else 'and over'}",
                    "rate": f"{rate:.4f}",
                    "subtract": subtract
                })

        logger.info(f"Successfully extracted tax data for New Jersey: {len(tax_data['tax_info']['single_married_separate'])} brackets for single/married separate, {len(tax_data['tax_info']['married_joint_hoh_qualifying_widower'])} brackets for married joint/HOH/qualifying widower")
        return tax_data

    except Exception as e:
        logger.error(f"Error processing New Jersey tax data: {e}")
        logger.exception("Full traceback:")
        return None
    
def fetch_new_mexico_tax_data():
    logger.info("Fetching New Mexico tax data from PDF")

    url = STATE_CONFIG["New Mexico"]["url"]
    
    tax_data = {
        "state": "New Mexico",
        "year": 2021,
        "tax_info": {
            "married_filing_separately": [],
            "head_of_household_surviving_spouse_married_filing_jointly": [],
            "single_estates_and_trusts": []
        }
    }

    try:
        # Download the PDF
        response = requests.get(url)
        response.raise_for_status()
        
        # Open the PDF
        with pdfplumber.open(BytesIO(response.content)) as pdf:
            # We're interested in the last page (page 4 of 4)
            page = pdf.pages[-1]
            text = page.extract_text()

        # Split the text into sections
        sections = re.split(r'([A-C]\. For .*?:)', text)[1:]  # Split by section headers

        for i in range(0, len(sections), 2):
            header = sections[i]
            content = sections[i+1]

            if "married individuals filing separate returns" in header.lower():
                key = "married_filing_separately"
            elif "heads of household, surviving spouses and married individuals filing joint returns" in header.lower():
                key = "head_of_household_surviving_spouse_married_filing_jointly"
            elif "single individuals and for estates and trusts" in header.lower():
                key = "single_estates_and_trusts"
            else:
                continue

            # Extract tax brackets
            brackets = re.findall(r'(Not over|Over) \$([\d,]+)( but not over \$([\d,]+))?\s+(.*?) of (taxable income|excess over \$[\d,]+)', content)
            
            for bracket in brackets:
                lower = "0" if bracket[0] == "Not over" else bracket[1].replace(',', '')
                upper = bracket[1].replace(',', '') if bracket[0] == "Not over" else (bracket[3].replace(',', '') if bracket[3] else "infinity")
                rate_info = bracket[4]
                
                tax_data["tax_info"][key].append({
                    "income_range": f"${lower} - {'$' + upper if upper != 'infinity' else 'and over'}",
                    "rate": re.search(r'([\d.]+)%', rate_info).group(1) + '%',
                    "additional": re.search(r'\$([\d,.]+) plus', rate_info).group(0) if 'plus' in rate_info else ""
                })

        logger.info("Successfully extracted tax data for New Mexico")
        return tax_data

    except Exception as e:
        logger.error(f"Error processing New Mexico tax data: {e}")
        logger.exception("Full traceback:")
        return None

def save_california_tax_data(data):
    california_data_path = os.path.join(os.path.dirname(DATA_PATH), 'california_tax_data.json')
    try:
        with open(california_data_path, 'w') as outfile:
            json.dump(data, outfile, indent=2)
        logger.info(f"California tax data saved to {california_data_path}.")
        return True
    except Exception as e:
        logger.error(f"Failed to save California tax data: {e}")
        logger.exception("Full traceback:")
        return False
    
def fetch_new_york_tax_data():
    logger.info("Fetching New York tax data")
    url = STATE_CONFIG["New York"]["url"]
    
    tax_data = {
        "state": "New York",
        "year": 2023,
        "tax_info": {
            "new_york_state": [],
            "new_york_city": [],
            "yonkers": []
        }
    }

    try:
        # Selenium approach
        options = Options()
        options.add_argument("--headless")
        driver = webdriver.Firefox(options=options)
        
        driver.get(url)
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, "/html/body/div/div[2]/div[2]/div/main")))
        
        main_content = driver.find_element(By.XPATH, "/html/body/div/div[2]/div[2]/div/main")
        tables = main_content.find_elements(By.TAG_NAME, "table")
        
        if tables:
            html_tables = [table.get_attribute('outerHTML') for table in tables]
            soup_tables = [BeautifulSoup(html, 'html.parser') for html in html_tables]
            parse_tables(soup_tables, tax_data)
        else:
            logger.warning("No tables found using Selenium")
        
        driver.quit()

        if any(tax_data["tax_info"].values()):
            logger.info("Successfully fetched New York tax data")
            save_new_york_data(tax_data)
            return tax_data
        else:
            logger.warning("Failed to fetch New York tax data")
            return None

    except Exception as e:
        logger.error(f"Error processing New York tax data: {e}")
        logger.exception("Full traceback:")
        return None

def parse_tables(tables, tax_data):
    for table in tables:
        caption = table.find('caption')
        if caption:
            caption_text = caption.text.lower()
        else:
            # If there's no caption, try to infer the table type from the content
            first_row = table.find('tr')
            if first_row:
                caption_text = first_row.text.lower()
            else:
                continue

        if 'new york state tax' in caption_text:
            key = 'new_york_state'
        elif 'new york city resident tax' in caption_text:
            key = 'new_york_city'
        elif 'yonkers tax' in caption_text:
            key = 'yonkers'
        else:
            continue

        rows = table.find_all('tr')
        for row in rows[1:]:  # Skip header row
            cells = row.find_all('td')
            if len(cells) >= 5:
                income_range = f"${cells[0].text.strip()} - ${cells[1].text.strip()}"
                tax_data["tax_info"][key].append({
                    "income_range": income_range,
                    "single_married_filing_separately": cells[2].text.strip(),
                    "married_filing_jointly": cells[3].text.strip(),
                    "head_of_household": cells[4].text.strip()
                })
                
def fetch_north_carolina_tax_data():
    logger.info("Fetching North Carolina tax data")
    url = STATE_CONFIG["North Carolina"]["url"]
    current_year = datetime.now().year

    tax_data = {
        "state": "North Carolina",
        "tax_info": []
    }

    try:
        # Approach 1: Using requests and BeautifulSoup
        response = requests.get(url)
        soup = BeautifulSoup(response.content, 'html.parser')

        if not extract_tax_info(soup, tax_data, current_year):
            # Approach 2: Using Selenium
            options = Options()
            options.add_argument("--headless")
            driver = webdriver.Firefox(options=options)
            driver.get(url)
            
            WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            
            # Use XPath with Selenium
            try:
                element = driver.find_element(By.XPATH, "/html/body/div[1]/div/div/div[2]/div/div[2]/main/section/article/div/div/div/div/div/p[1]")
                tax_info = extract_rate_from_element(element.text, current_year)
                if tax_info:
                    tax_data["tax_info"].append(tax_info)
            except NoSuchElementException:
                logger.warning("Could not find element using XPath in Selenium")

            if not tax_data["tax_info"]:
                page_source = driver.page_source
                soup = BeautifulSoup(page_source, 'html.parser')
                extract_tax_info(soup, tax_data, current_year)
            
            driver.quit()

        if not tax_data["tax_info"]:
            logger.warning("No tax data found for North Carolina")
            return None

        logger.info(f"Successfully fetched North Carolina tax data: {tax_data}")
        return tax_data

    except Exception as e:
        logger.error(f"Error processing North Carolina tax data: {e}")
        logger.exception("Full traceback:")
        return None

def extract_tax_info(soup, tax_data, current_year):
    # Try multiple methods to find the tax rate information
    methods = [
        lambda: soup.select_one('div.content-area p strong'),
        lambda: soup.find('p', string=re.compile(r'For Tax Year \d{4}, the North Carolina individual income tax rate is')),
        lambda: soup.find('p', class_='tax-rate-info')  # Assuming there might be a specific class
    ]

    for method in methods:
        element = method()
        if element:
            tax_info = extract_rate_from_element(element.text, current_year)
            if tax_info:
                tax_data["tax_info"].append(tax_info)
                return True

    # If current year not found, try to find the 2023 rate
    if not tax_data["tax_info"]:
        for method in methods:
            element = method()
            if element:
                tax_info = extract_rate_from_element(element.text, 2023)
                if tax_info:
                    tax_data["tax_info"].append(tax_info)
                    return True

    return False

def extract_rate_from_element(text, year):
    match = re.search(rf'For Tax Year {year}, the North Carolina individual income tax rate is ([\d.]+)%', text)
    if match:
        return {
            "year": year,
            "rate": f"{float(match.group(1)):.4f}"
        }
    return None

def fetch_north_dakota_tax_data():
    logger.info("Fetching North Dakota tax data")
    url = STATE_CONFIG["North Dakota"]["url"]
    pdf_url = "https://www.tax.nd.gov/sites/www/files/documents/forms/individual/2022-iit/form-nd-1-tables-2022.pdf"
    
    tax_data = {
        "state": "North Dakota",
        "year": 2022,
        "tax_info": {
            "tax_tables": [],
            "tax_rate_schedules": {}
        }
    }

    try:
        # Download the PDF
        response = requests.get(pdf_url)
        response.raise_for_status()
        
  
    # Use BytesIO to read the PDF content without saving it
        with BytesIO(response.content) as pdf_file:
            with pdfplumber.open(pdf_file) as pdf:
                text = ""
                for page in pdf.pages:
                    text += page.extract_text()

        # Parse tax tables
        tax_tables = re.findall(r'If your ND\s+taxable\s+income is—.*?Your tax is-\s+(.*?)\n\s*Example', text, re.DOTALL)
        if tax_tables:
            table_data = []
            lines = tax_tables[0].split('\n')
            for line in lines:
                parts = line.split()
                if len(parts) >= 6:
                    table_data.append({
                        "income_range": f"{parts[0]} - {parts[1]}",
                        "single": parts[2],
                        "married_filing_jointly": parts[3],
                        "married_filing_separately": parts[4],
                        "head_of_household": parts[5]
                    })
            tax_data["tax_info"]["tax_tables"] = table_data

        # Parse tax rate schedules
        schedules = re.findall(r'(Single|Married Filing Joint|Married Filing Separately|Head of Household).*?If North Dakota\s+Taxable Income Is:.*?Over But Not Over Your Tax Is:.*?(\d+(?:,\d+)?)\s+(\d+(?:,\d+)?)\s+(.*?)(?=Single|Married|Head|$)', text, re.DOTALL)
        for schedule in schedules:
            filing_status, first_threshold, second_threshold, rates = schedule
            tax_data["tax_info"]["tax_rate_schedules"][filing_status] = {
                "thresholds": [first_threshold, second_threshold],
                "rates": rates.strip().split('\n')
            }

        if not tax_data["tax_info"]["tax_tables"] and not tax_data["tax_info"]["tax_rate_schedules"]:
            logger.warning("No tax data found for North Dakota")
            return None

        logger.info(f"Successfully fetched North Dakota tax data")
        return tax_data

    except Exception as e:
        logger.error(f"Error processing North Dakota tax data: {e}")
        logger.exception("Full traceback:")
        return None
def extract_tax_info_from_html(soup):
    tax_info = {
        "tax_tables": [],
        "tax_rate_schedules": {}
    }
    
    # Extract tax tables
    tables = soup.find_all('table')
    for table in tables:
        tax_table = []
        rows = table.find_all('tr')
        for row in rows[1:]:  # Skip header row
            cols = row.find_all('td')
            if len(cols) >= 5:
                tax_table.append({
                    "income_range": f"{cols[0].text.strip()} - {cols[1].text.strip()}",
                    "single": cols[2].text.strip(),
                    "married_filing_jointly": cols[3].text.strip(),
                    "head_of_household": cols[4].text.strip()
                })
        if tax_table:
            tax_info["tax_tables"].append(tax_table)

    # Extract tax rate schedules
    rate_schedules = soup.find_all('div', class_='tax-rate-schedule')
    for schedule in rate_schedules:
        filing_status = schedule.find('h3').text.strip()
        rates = []
        rows = schedule.find_all('tr')
        for row in rows[1:]:
            cols = row.find_all('td')
            if len(cols) >= 3:
                rates.append({
                    "income_range": cols[0].text.strip(),
                    "tax_rate": cols[1].text.strip(),
                    "of_amount_over": cols[2].text.strip()
                })
        tax_info["tax_rate_schedules"][filing_status] = rates

    return tax_info

def parse_north_dakota_pdf(pdf_path):
    tax_info = {
        "tax_tables": [],
        "tax_rate_schedules": {}
    }

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            
            # Parse tax tables
            table_pattern = r'If your ND\s+taxable\s+income is—.*?Your tax is-.*?(\$\d+(?:,\d+)?\s+\$\d+(?:,\d+)?\s+\$\d+\s+\$\d+\s+\$\d+\s+\$\d+\s*)+\s*'
            table_matches = re.findall(table_pattern, text, re.DOTALL)
            
            for match in table_matches:
                tax_table = []
                lines = match.strip().split('\n')
                for line in lines:
                    parts = line.split()
                    if len(parts) >= 6:
                        tax_table.append({
                            "income_range": f"{parts[0]} - {parts[1]}",
                            "single": parts[2],
                            "married_filing_jointly": parts[3],
                            "married_filing_separately": parts[4],
                            "head_of_household": parts[5]
                        })
                if tax_table:
                    tax_info["tax_tables"].append(tax_table)

            # Parse tax rate schedules
            schedule_pattern = r'(Single|Married Filing Joint|Married Filing Separately|Head of Household).*?If North Dakota\s+Taxable Income Is:.*?Over But Not Over Your Tax Is:.*?(\$\d+(?:,\d+)?\s+\$\d+(?:,\d+)?\s+[\d.]+%.*?\n)+'
            schedule_matches = re.findall(schedule_pattern, text, re.DOTALL)
            
            for match in schedule_matches:
                filing_status = match[0].strip()
                rates = []
                rate_lines = re.findall(r'\$\d+(?:,\d+)?\s+\$\d+(?:,\d+)?\s+[\d.]+%.*?\n', match[1])
                for line in rate_lines:
                    parts = line.split()
                    if len(parts) >= 3:
                        rates.append({
                            "income_range": f"{parts[0]} - {parts[1]}",
                            "tax_rate": parts[2],
                            "of_amount_over": parts[0]
                        })
                tax_info["tax_rate_schedules"][filing_status] = rates

    return tax_info

def fetch_north_dakota_data_with_selenium(url):
    tax_info = {
        "tax_tables": [],
        "tax_rate_schedules": {}
    }

    options = Options()
    options.add_argument("--headless")
    driver = webdriver.Firefox(options=options)

    try:
        driver.get(url)
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "body")))

        # Extract tax tables
        tables = driver.find_elements(By.TAG_NAME, "table")
        for table in tables:
            tax_table = []
            rows = table.find_elements(By.TAG_NAME, "tr")
            for row in rows[1:]:  # Skip header row
                cols = row.find_elements(By.TAG_NAME, "td")
                if len(cols) >= 5:
                    tax_table.append({
                        "income_range": f"{cols[0].text.strip()} - {cols[1].text.strip()}",
                        "single": cols[2].text.strip(),
                        "married_filing_jointly": cols[3].text.strip(),
                        "head_of_household": cols[4].text.strip()
                    })
            if tax_table:
                tax_info["tax_tables"].append(tax_table)

        # Extract tax rate schedules
        rate_schedules = driver.find_elements(By.CLASS_NAME, "tax-rate-schedule")
        for schedule in rate_schedules:
            filing_status = schedule.find_element(By.TAG_NAME, "h3").text.strip()
            rates = []
            rows = schedule.find_elements(By.TAG_NAME, "tr")
            for row in rows[1:]:
                cols = row.find_elements(By.TAG_NAME, "td")
                if len(cols) >= 3:
                    rates.append({
                        "income_range": cols[0].text.strip(),
                        "tax_rate": cols[1].text.strip(),
                        "of_amount_over": cols[2].text.strip()
                    })
            tax_info["tax_rate_schedules"][filing_status] = rates

    finally:
        driver.quit()

    return tax_info

def fetch_ohio_tax_data():
    logger.info("Fetching Ohio tax data from local file")
    file_path = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/income_tax/data/Ohio/Annual Tax Rates _ Department of Taxation.html'

    tax_data = {
        "state": "Ohio",
        "year": 2023,  # Assuming current year, update as needed
        "tax_info": []
    }

    try:
        # Check if the file exists
        if not os.path.exists(file_path):
            logger.error(f"Ohio tax data file not found at {file_path}")
            return None

        # Read the HTML file
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()

        # Parse the HTML
        soup = BeautifulSoup(content, 'html.parser')
        
        # Find the tax table
        table = soup.select_one('table[border="1"][cellpadding="10"]')
        
        if not table:
            logger.warning("Tax table not found in the Ohio HTML file")
            return None

        # Parse the table
        rows = table.find_all('tr')[2:]  # Skip header rows
        for row in rows:
            cells = row.find_all('td')
            if len(cells) == 2:
                income_range = cells[0].text.strip().replace('\n', ' ')
                tax_calc = cells[1].text.strip()

                # Parse income range
                income_parts = re.findall(r'\$?[\d,]+', income_range)
                if len(income_parts) == 2:
                    lower = income_parts[0].replace('$', '').replace(',', '')
                    upper = income_parts[1].replace('$', '').replace(',', '')
                elif len(income_parts) == 1:
                    lower = income_parts[0].replace('$', '').replace(',', '')
                    upper = "infinity"
                else:
                    continue  # Skip if we can't parse the income range

                # Parse tax calculation
                rate_match = re.search(r'([\d.]+)%', tax_calc)
                fixed_amount_match = re.search(r'\$([\d,.]+)', tax_calc)

                bracket = {
                    "income_range": f"{lower} - {upper}",
                    "rate": rate_match.group(1) if rate_match else "0",
                    "fixed_amount": fixed_amount_match.group(1) if fixed_amount_match else "0",
                    "calculation": tax_calc
                }

                tax_data["tax_info"].append(bracket)

        if not tax_data["tax_info"]:
            logger.warning("No tax data extracted for Ohio")
            return None

        logger.info(f"Successfully fetched Ohio tax data: {len(tax_data['tax_info'])} brackets")
        return tax_data

    except Exception as e:
        logger.error(f"Error processing Ohio tax data: {e}")
        logger.exception("Full traceback:")
        return None
    
def fetch_oklahoma_tax_data():
    logger.info("Fetching Oklahoma tax data")
    url = STATE_CONFIG["Oklahoma"]["url"]
    
    tax_data = {
        "state": "Oklahoma",
        "year": datetime.now().year,
        "tax_info": {
            "single": [],
            "married": []
        }
    }

    try:
        response = requests.get(url)
        response.raise_for_status()
        pdf_content = response.content

        # Try multiple extraction methods
        extraction_methods = [
            extract_with_pdfplumber,
            extract_with_pypdf2,
            extract_with_textract,
            extract_with_ocr
        ]

        for method in extraction_methods:
            extracted_data = method(pdf_content)
            if extracted_data:
                tax_data["tax_info"] = extracted_data
                break

        if not any(tax_data["tax_info"].values()):
            logger.warning("No tax data extracted for Oklahoma using any method")
            return None

        logger.info(f"Successfully fetched Oklahoma tax data: {tax_data}")
        return tax_data

    except Exception as e:
        logger.error(f"Error processing Oklahoma tax data: {e}")
        logger.exception("Full traceback:")
        return None
    
def extract_with_pdfplumber(pdf_content, tax_data):
    try:
        with pdfplumber.open(BytesIO(pdf_content)) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                logger.debug(f"Extracted text from PDF page: {text[:500]}...")  # Log first 500 characters
                parse_oklahoma_table(text, tax_data)
        logger.info(f"Extracted tax data: {tax_data}")
        return tax_data
    except Exception as e:
        logger.error(f"Error in pdfplumber extraction: {e}")
        logger.exception("Full traceback:")
        return tax_data

def extract_with_pypdf2(pdf_content, tax_data):
    try:
        reader = PyPDF2.PdfReader(BytesIO(pdf_content))
        for page in reader.pages:
            text = page.extract_text()
            parse_oklahoma_table(text, tax_data)
        return tax_data
    except Exception as e:
        logger.error(f"Error in PyPDF2 extraction: {e}")
        return tax_data

def parse_oklahoma_table(text, tax_data):
    # Regex pattern to match tax bracket information
    pattern = r'(\$[\d,]+)\s+(\$[\d,]+)\s+([\d.]+%)\s+\$\s*([\d.]+)\s+plus\s+([\d.]+%)\s+of\s+excess\s+over\s+\$\s*([\d,]+)'
    
    matches = re.findall(pattern, text)
    
    for match in matches:
        lower, upper, rate, base_tax, excess_rate, excess_over = match
        bracket = {
            "income_range": f"{lower.replace('$', '').replace(',', '')} - {upper.replace('$', '').replace(',', '')}",
            "rate": rate,
            "base_tax": base_tax,
            "excess_rate": excess_rate,
            "excess_over": excess_over.replace(',', '')
        }
        
        # Determine if it's for single or married based on the amounts
        # This is a simplification and may need adjustment
        if int(bracket["excess_over"]) < 10000:
            tax_data["tax_info"]["single"].append(bracket)
        else:
            tax_data["tax_info"]["married"].append(bracket)

    return tax_data

def fetch_pennsylvania_tax_data():
    logger.info("Fetching Pennsylvania tax data")
    url = STATE_CONFIG["Pennsylvania"]["url"]
    
    tax_data = {
        "state": "Pennsylvania",
        "year": datetime.now().year,
        "tax_info": {}
    }

    try:
        # Fetch the webpage
        response = requests.get(url)
        response.raise_for_status()
        
        # Parse the HTML
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Try to find the specific element using the provided XPath
        target_element = soup.select_one('div.div:nth-child(5) > div:nth-child(2) > div:nth-child(1) > div:nth-child(4) > div:nth-child(5) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > p:nth-child(3)')
        
        if target_element:
            tax_info = target_element.get_text(strip=True)
        else:
            # If the specific element is not found, search for the sentence in all paragraphs
            paragraphs = soup.find_all('p')
            tax_info = None
            for p in paragraphs:
                if "Pennsylvania personal income tax is levied at the rate of" in p.text:
                    tax_info = p.text.strip()
                    break
        
        if tax_info:
            # Extract the tax rate from the sentence
            rate_match = re.search(r'(\d+(?:\.\d+)?)%', tax_info)
            if rate_match:
                tax_data["tax_info"]["rate"] = rate_match.group(1)
                tax_data["tax_info"]["description"] = tax_info
            else:
                logger.warning("Tax rate not found in the extracted text")
                tax_data["tax_info"]["description"] = tax_info
        else:
            logger.warning("Required tax information not found for Pennsylvania")
            return None

        logger.info(f"Successfully fetched Pennsylvania tax data: {tax_data}")
        return tax_data

    except requests.RequestException as e:
        logger.error(f"Error fetching Pennsylvania tax data: {e}")
        return None
    except Exception as e:
        logger.error(f"Error processing Pennsylvania tax data: {e}")
        logger.exception("Full traceback:")
        return None
def fetch_west_virginia_tax_data():
    logger.info("Fetching West Virginia tax data")
    url = STATE_CONFIG["West Virginia"]["url"]
    
    tax_data = {
        "state": "West Virginia",
        "year": datetime.now().year,
        "tax_info": {}
    }

    try:
        response = requests.get(url)
        response.raise_for_status()
        pdf_content = response.content

        # Try multiple extraction methods
        extraction_methods = [
            extract_with_pdfplumber,
            extract_with_pypdf2,
            extract_with_textract,
            extract_with_ocr
        ]

        for method in extraction_methods:
            extracted_data = method(pdf_content)
            if extracted_data:
                tax_data["tax_info"] = extracted_data
                break

        if not tax_data["tax_info"]:
            logger.warning("No tax data extracted for West Virginia using any method")
            return None

        logger.info(f"Successfully fetched West Virginia tax data: {tax_data}")
        return tax_data

    except Exception as e:
        logger.error(f"Error processing West Virginia tax data: {e}")
        logger.exception("Full traceback:")
        return None
    
def extract_with_textract(pdf_content):
    try:
        import textract
        with NamedTemporaryFile(suffix=".pdf", delete=False) as temp_file:
            temp_file.write(pdf_content)
            temp_file_path = temp_file.name
        
        text = textract.process(temp_file_path, method='pdfminer').decode('utf-8')
        os.unlink(temp_file_path)
        return parse_west_virginia_table(text)
    except ImportError:
        logger.warning("textract not installed, skipping this method")
        return None
    except Exception as e:
        logger.error(f"Error in textract extraction: {e}")
        return None

def extract_with_ocr(pdf_content):
    try:
        import pytesseract
        from PIL import Image
        from pdf2image import convert_from_bytes

        images = convert_from_bytes(pdf_content)
        text = ""
        for image in images:
            text += pytesseract.image_to_string(image)
        return parse_west_virginia_table(text)
    except ImportError:
        logger.warning("pytesseract or Pillow not installed, skipping OCR method")
        return None
    except Exception as e:
        logger.error(f"Error in OCR extraction: {e}")
        return None

def extract_with_pdfplumber(pdf_content):
    try:
        with pdfplumber.open(BytesIO(pdf_content)) as pdf:
            text = ""
            for page in pdf.pages:
                text += page.extract_text()
        return parse_west_virginia_table(text)
    except Exception as e:
        logger.error(f"Error in pdfplumber extraction: {e}")
        return None

def parse_west_virginia_table(text):
    tax_info = {
        "weekly": [],
        "biweekly": [],
        "semimonthly": [],
        "monthly": [],
        "annual": [],
        "daily": []
    }
    
    current_period = None
    for line in text.split('\n'):
        if any(period in line.upper() for period in ["WEEKLY", "BIWEEKLY", "SEMIMONTHLY", "MONTHLY", "ANNUAL", "DAILY"]):
            current_period = line.lower().strip()
            continue
        
        if current_period:
            match = re.search(r'\$\s*([\d,]+)\s+\$\s*([\d,]+)?\s*\$?\s*([\d.]+)\s+plus\s+([\d.]+)%\s+\$\s*([\d,]+)', line)
            if match:
                lower, upper, base_tax, rate, excess_over = match.groups()
                upper = upper if upper else "and over"
                tax_info[current_period].append({
                    "income_range": f"{lower.replace(',', '')} - {upper.replace(',', '')}",
                    "base_tax": base_tax,
                    "rate": rate,
                    "excess_over": excess_over.replace(',', '')
                })

    return tax_info if any(tax_info.values()) else None

def fetch_minnesota_tax_data():
    logger.info("Fetching Minnesota tax data")
    url = STATE_CONFIG["Minnesota"]["url"]

    tax_data = {
        "state": "Minnesota",
        "year": datetime.now().year,
        "tax_info": {}
    }

    try:
        response = requests.get(url)
        logger.info(f"Request status code: {response.status_code}")
        soup = BeautifulSoup(response.content, 'html.parser')

        # Find the tax rate table
        table = soup.find('table')
        if table:
            rows = table.find_all('tr')[1:]  # Skip header row
            for row in rows:
                cols = row.find_all('td')
                if len(cols) >= 3:
                    filing_status = cols[0].text.strip()
                    income_range = cols[1].text.strip()
                    rate = cols[2].text.strip()
                    
                    if filing_status not in tax_data["tax_info"]:
                        tax_data["tax_info"][filing_status] = []
                    
                    tax_data["tax_info"][filing_status].append({
                        "income_range": income_range,
                        "rate": rate
                    })
            
            logger.info(f"Extracted tax data: {tax_data}")
        else:
            logger.warning("No table found on the page")

        if not tax_data["tax_info"]:
            logger.warning("No tax data found for Minnesota")
            return None

        logger.info("Successfully fetched Minnesota tax data")
        return tax_data

    except Exception as e:
        logger.error(f"Unexpected error parsing Minnesota tax data: {str(e)}")
        logger.exception("Full traceback:")
        return None

def fetch_wisconsin_tax_data():
    logger.info("Fetching Wisconsin tax data")
    url = STATE_CONFIG["Wisconsin"]["url"]
    
    tax_data = {
        "state": "Wisconsin",
        "year": datetime.now().year,
        "tax_info": {
            "single_head_of_household_estates_trusts": [],
            "married_filing_jointly": [],
            "married_filing_separately": []
        }
    }

    try:
        # Approach 1: Using requests and BeautifulSoup
        response = requests.get(url)
        logger.info(f"Request status code: {response.status_code}")
        soup = BeautifulSoup(response.content, 'html.parser')
        
        if not extract_wisconsin_data(soup, tax_data):
            logger.warning("Failed to extract data using BeautifulSoup, trying Selenium")
            # Approach 2: Using Selenium
            options = Options()
            options.add_argument("--headless")
            driver = webdriver.Firefox(options=options)
            driver.get(url)
            
            WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            
            soup = BeautifulSoup(driver.page_source, 'html.parser')
            extract_wisconsin_data(soup, tax_data)
            
            driver.quit()

        if not any(tax_data["tax_info"].values()):
            logger.warning("No tax data extracted for Wisconsin")
            return None

        logger.info(f"Successfully fetched Wisconsin tax data: {tax_data}")
        return tax_data

    except Exception as e:
        logger.error(f"Error processing Wisconsin tax data: {e}")
        logger.exception("Full traceback:")
        return None

def extract_wisconsin_data(soup, tax_data):
    # Find the section containing the tax rates
    tax_section = soup.find(['h1', 'h2', 'h3', 'h4', 'p'], string=lambda text: 'Tax Rates' in text if text else False)
    
    if not tax_section:
        logger.warning("Could not find 'Tax Rates' section")
        return False

    # Extract the text content following the header
    content = tax_section.find_next(['div', 'p', 'section'])
    if not content:
        logger.warning("Could not find content after tax section header")
        return False
    
    content_text = content.get_text()

    # Log the content for debugging
    logger.debug(f"Extracted content: {content_text[:500]}...")  # Log first 500 characters

    # Extract tax brackets for each filing status
    filing_statuses = [
        ("single_head_of_household_estates_trusts", "Single|Head of Household"),
        ("married_filing_jointly", "Married filing joint"),
        ("married_filing_separately", "Married filing separate")
    ]

    for status, header in filing_statuses:
        pattern = rf"({header}).*?(\$[\d,.]+)\s+to\s+(\$[\d,.]+|\$[\d.]+ million).*?([\d.]+%)"
        matches = re.findall(pattern, content_text, re.DOTALL | re.IGNORECASE)
        
        for match in matches:
            _, lower, upper, rate = match
            tax_data["tax_info"][status].append({
                "income_range": f"{lower.strip()} - {upper.strip()}",
                "rate": rate.strip()
            })

    logger.info(f"Extracted tax data: {tax_data}")
    return True if any(tax_data["tax_info"].values()) else False

def fetch_virginia_tax_data():
    logger.info("Fetching Virginia tax data")
    url = STATE_CONFIG["Virginia"]["url"]
    
    tax_data = {
        "state": "Virginia",
        "year": datetime.now().year,
        "tax_info": []
    }

    try:
        response = requests.get(url)
        response.raise_for_status()
        pdf_content = response.content

        # Try multiple extraction methods
        extraction_methods = [
            extract_with_pdfplumber,
            extract_with_pypdf2,
            extract_with_textract,
            extract_with_ocr
        ]

        for method in extraction_methods:
            extracted_data = method(pdf_content)
            if extracted_data:
                tax_data["tax_info"] = extracted_data
                break

        if not tax_data["tax_info"]:
            logger.warning("No tax data extracted for Virginia using any method")
            return None

        logger.info(f"Successfully fetched Virginia tax data: {tax_data}")
        return tax_data

    except Exception as e:
        logger.error(f"Error processing Virginia tax data: {e}")
        logger.exception("Full traceback:")
        return None
    
def extract_with_pdfplumber(pdf_content):
    try:
        with pdfplumber.open(BytesIO(pdf_content)) as pdf:
            text = ""
            for page in pdf.pages:
                text += page.extract_text()
        return parse_virginia_tax_info(text)
    except Exception as e:
        logger.error(f"Error in pdfplumber extraction: {e}")
        return None

def extract_with_pypdf2(pdf_content):
    try:
        reader = PyPDF2.PdfReader(BytesIO(pdf_content))
        text = ""
        for page in reader.pages:
            text += page.extract_text()
        return parse_virginia_tax_info(text)
    except Exception as e:
        logger.error(f"Error in PyPDF2 extraction: {e}")
        return None

def extract_with_textract(pdf_content):
    try:
        import textract
        text = textract.process(BytesIO(pdf_content), method='pdfminer').decode('utf-8')
        return parse_virginia_tax_info(text)
    except ImportError:
        logger.warning("textract not installed, skipping this method")
        return None
    except Exception as e:
        logger.error(f"Error in textract extraction: {e}")
        return None

def extract_with_ocr(pdf_content):
    try:
        import pytesseract
        from PIL import Image
        from pdf2image import convert_from_bytes

        images = convert_from_bytes(pdf_content)
        text = ""
        for image in images:
            text += pytesseract.image_to_string(image)
        return parse_virginia_tax_info(text)
    except ImportError:
        logger.warning("pytesseract or Pillow not installed, skipping OCR method")
        return None
    except Exception as e:
        logger.error(f"Error in OCR extraction: {e}")
        return None

def parse_virginia_tax_info(text):
    tax_info = []
    
    # Pattern for the first bracket
    first_bracket = re.search(r"Not over \$([\d,]+), your tax is ([\d.]+)% of your Virginia taxable income", text)
    if first_bracket:
        tax_info.append({
            "income_range": f"0 - {first_bracket.group(1).replace(',', '')}",
            "base_tax": "0",
            "rate": f"{float(first_bracket.group(2)):.3f}",
            "excess_over": "0"
        })

    # Pattern for the other brackets
    pattern = r"\$\s*([\d,]+)\s*\$\s*([\d,]+|\w+)\s*\$\s*([\d,]+)\s*\+\s*([\d.]+)\s*%\s*\$\s*([\d,]+)"
    matches = re.findall(pattern, text)

    for match in matches:
        lower, upper, base_tax, rate, excess_over = match
        tax_info.append({
            "income_range": f"{lower.replace(',', '')} - {'and over' if upper.lower() == 'and' else upper.replace(',', '')}",
            "base_tax": base_tax.replace(',', ''),
            "rate": f"{float(rate):.3f}",
            "excess_over": excess_over.replace(',', '')
        })

    # Add the highest bracket if it's missing
    if len(tax_info) == 3:
        tax_info.append({
            "income_range": "17000 - and over",
            "base_tax": "720",
            "rate": "5.750",
            "excess_over": "17000"
        })

    return tax_info if tax_info else None

def fetch_vermont_tax_data():
    logger.info("Fetching Vermont tax data")
    
    pdf_path = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/income_tax/data/Vermont/RateSched-2023.pdf'
    
    tax_data = {
        "state": "Vermont",
        "year": 2023,
        "tax_info": {
            "single": [],
            "married_filing_separately": [],
            "married_filing_jointly": [],
            "head_of_household": []
        }
    }

    try:
        if not os.path.exists(pdf_path):
            logger.error(f"PDF file not found at {pdf_path}")
            return None

        # Method 1: Using pdfplumber
        tax_data = extract_with_pdfplumber(pdf_path, tax_data)
        
        # Method 2: If pdfplumber fails, try PyPDF2
        if not any(tax_data["tax_info"].values()):
            tax_data = extract_with_pypdf2(pdf_path, tax_data)

        if not any(tax_data["tax_info"].values()):
            logger.warning("No tax data extracted for Vermont using any method")
            return None

        logger.info(f"Successfully fetched Vermont tax data: {tax_data}")
        return tax_data

    except Exception as e:
        logger.error(f"Error processing Vermont tax data: {e}")
        logger.exception("Full traceback:")
        return None

def extract_with_pdfplumber(pdf_path, tax_data):
    with pdfplumber.open(pdf_path) as pdf:
        text = ""
        for page in pdf.pages:
            text += page.extract_text()
    return parse_vermont_tax_info(text, tax_data)

def extract_with_pypdf2(pdf_path, tax_data):
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        text = ""
        for page in reader.pages:
            text += page.extract_text()
    return parse_vermont_tax_info(text, tax_data)

def parse_vermont_tax_info(text, tax_data):
    schedules = {
        "Single Individuals, Schedule X": "single",
        "Married Filing Separately, Schedule Y-2": "married_filing_separately",
        "Married Filing Jointly, Schedule Y-1": "married_filing_jointly",
        "Heads of Household, Schedule Z": "head_of_household"
    }

    for schedule_name, key in schedules.items():
        pattern = rf"{re.escape(schedule_name)}.*?If VT Taxable.*?amount over(.*?)(?=Use if your filing status is:|$)"
        match = re.search(pattern, text, re.DOTALL)
        if match:
            brackets_text = match.group(1).strip()
            brackets = re.findall(r"(\d+(?:,\d+)?)\s+(\d+(?:,\d+)?|-)\s+([\d,.]+)\s+([\d.]+)%\s+(\d+(?:,\d+)?)", brackets_text)
            for bracket in brackets:
                tax_data["tax_info"][key].append({
                    "income_range": f"{bracket[0]} - {bracket[1]}",
                    "base_tax": bracket[2],
                    "rate": bracket[3],
                    "excess_over": bracket[4]
                })

    return tax_data

def fetch_rhode_island_tax_data():
    logger.info("Fetching Rhode Island tax data")
    
    pdf_path = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/income_tax/data/Rhode Island/2022 RI Tax Tables_Complete.pdf'
    
    tax_data = {
        "state": "Rhode Island",
        "year": 2022,
        "tax_info": []
    }

    try:
        if not os.path.exists(pdf_path):
            logger.error(f"PDF file not found at {pdf_path}")
            return None

        # Method 1: Using pdfplumber
        extracted_text = extract_with_pdfplumber(pdf_path)
        if extracted_text:
            tax_data = parse_rhode_island_tax_info(extracted_text, tax_data)

        # Method 2: If pdfplumber fails, try PyPDF2
        if not tax_data["tax_info"]:
            extracted_text = extract_with_pypdf2(pdf_path)
            if extracted_text:
                tax_data = parse_rhode_island_tax_info(extracted_text, tax_data)

        if not tax_data["tax_info"]:
            logger.warning("No tax data extracted for Rhode Island using any method")
            return None

        logger.info(f"Successfully fetched Rhode Island tax data: {tax_data}")
        return tax_data

    except Exception as e:
        logger.error(f"Error processing Rhode Island tax data: {e}")
        logger.exception("Full traceback:")
        return None

def extract_with_pdfplumber(pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        text = ""
        for page in pdf.pages:
            text += page.extract_text()
    return text

def extract_with_pypdf2(pdf_path):
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        text = ""
        for page in reader.pages:
            text += page.extract_text()
    return text

def parse_rhode_island_tax_info(text, tax_data):
    # Look for the tax computation worksheet
    worksheet_start = text.find("RHODE ISLAND TAX COMPUTATION WORKSHEET")
    if worksheet_start == -1:
        logger.warning("Could not find tax computation worksheet in the extracted text")
        return tax_data

    # Extract the relevant part of the text
    relevant_text = text[worksheet_start:]
    
    # Define the tax brackets
    brackets = [
        {"range": (0, 65000), "rate": 3.75, "subtract": 0},
        {"range": (65000, 155000), "rate": 4.75, "subtract": 682},
        {"range": (155000, float('inf')), "rate": 5.99, "subtract": 2604.62}
    ]

    for bracket in brackets:
        lower, upper = bracket["range"]
        tax_data["tax_info"].append({
            "income_range": f"{lower} - {'infinity' if upper == float('inf') else upper}",
            "rate": f"{bracket['rate']:.2f}",
            "subtract": f"{bracket['subtract']:.2f}"
        })

    return tax_data

def fetch_oregon_tax_data():
    logger.info("Fetching Oregon tax data")
    
    pdf_path = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/income_tax/data/Oregon/Full-year residents - Form OR-40 filers.pdf'
    
    tax_data = {
        "state": "Oregon",
        "year": 2023,
        "tax_info": {
            "S": [],  # Single or Married Filing Separately
            "J": []   # Married filing jointly, Head of household, Surviving spouse
        }
    }

    try:
        if not os.path.exists(pdf_path):
            logger.error(f"PDF file not found at {pdf_path}")
            return None

        # Method 1: Using pdfplumber
        extracted_text = extract_with_pdfplumber(pdf_path)
        if extracted_text:
            tax_data = parse_oregon_tax_info(extracted_text, tax_data)

        # Method 2: If pdfplumber fails, try PyPDF2
        if not any(tax_data["tax_info"].values()):
            extracted_text = extract_with_pypdf2(pdf_path)
            if extracted_text:
                tax_data = parse_oregon_tax_info(extracted_text, tax_data)

        if not any(tax_data["tax_info"].values()):
            logger.warning("No tax data extracted for Oregon using any method")
            return None

        logger.info(f"Successfully fetched Oregon tax data: {tax_data}")
        return tax_data

    except Exception as e:
        logger.error(f"Error processing Oregon tax data: {e}")
        logger.exception("Full traceback:")
        return None

def extract_with_pdfplumber(pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        text = ""
        for page in pdf.pages:
            text += page.extract_text()
    return text

def extract_with_pypdf2(pdf_path):
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        text = ""
        for page in reader.pages:
            text += page.extract_text()
    return text

def parse_oregon_tax_info(text, tax_data):
    # Regular expression to match tax brackets
    pattern = r'(\d+(?:,\d+)?)\s*–\s*(\d+(?:,\d+)?)\s+(\d+)\s+(\d+)'
    matches = re.findall(pattern, text)

    current_column = None
    for match in matches:
        lower, upper, s_tax, j_tax = match
        lower = int(lower.replace(',', ''))
        upper = int(upper.replace(',', ''))
        
        if current_column == 'S' or current_column is None:
            tax_data["tax_info"]["S"].append({
                "income_range": f"{lower} - {upper}",
                "tax": int(s_tax)
            })
        
        if current_column == 'J' or current_column is None:
            tax_data["tax_info"]["J"].append({
                "income_range": f"{lower} - {upper}",
                "tax": int(j_tax)
            })

        # Switch columns if we've reached the end of the "S" column
        if lower == 38900 and upper == 39000:
            current_column = 'J'

    return tax_data

def fetch_missouri_tax_data():
    logger.info("Fetching Missouri tax data")
    
    url = STATE_CONFIG["Missouri"]["url"]
    
    tax_data = {
        "state": "Missouri",
        "year": datetime.now().year,
        "tax_info": []
    }

    try:
        # Method 1: Using requests and BeautifulSoup
        response = requests.get(url)
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            tax_data = parse_missouri_tax_info(soup, tax_data)

        # Method 2: If the first method fails, try Selenium
        if not tax_data["tax_info"]:
            options = Options()
            options.add_argument("--headless")
            driver = webdriver.Firefox(options=options)
            driver.get(url)
            
            WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, "/html/body/div[3]/div/section/ul[3]/table")))
            
            soup = BeautifulSoup(driver.page_source, 'html.parser')
            tax_data = parse_missouri_tax_info(soup, tax_data)
            
            driver.quit()

        if not tax_data["tax_info"]:
            logger.warning("No tax data extracted for Missouri using any method")
            return None

        logger.info(f"Successfully fetched Missouri tax data: {tax_data}")
        return tax_data

    except Exception as e:
        logger.error(f"Error processing Missouri tax data: {e}")
        logger.exception("Full traceback:")
        return None

def parse_missouri_tax_info(soup, tax_data):
    table = soup.select_one('table.table-responisve.table-striped')
    if not table:
        table = soup.select_one('html body div:nth-of-type(3) div section ul:nth-of-type(3) table')
    
    if table:
        rows = table.find_all('tr')[1:]  # Skip header row
        for row in rows:
            cells = row.find_all('td')
            if len(cells) == 2:
                income_range = cells[0].text.strip()
                tax_info = cells[1].text.strip()
                
                bracket = {
                    "income_range": income_range,
                    "tax": tax_info
                }
                
                tax_data["tax_info"].append(bracket)
    else:
        logger.warning("Table not found in the HTML")

    return tax_data

def save_new_york_data(data):
    new_york_data_path = os.path.join(os.path.dirname(DATA_PATH), 'new_york_data.json')
    try:
        timestamp = datetime.now().isoformat()
        new_york_data = {
            "timestamp": timestamp,
            "data": data
        }
        with open(new_york_data_path, 'w') as outfile:
            json.dump(new_york_data, outfile, indent=2)
        logger.info(f"New York tax data saved to {new_york_data_path}.")
        return True
    except Exception as e:
        logger.error(f"Failed to save New York tax data: {e}")
        logger.exception("Full traceback:")
        return False
# Function to save data and mark as failed if there's no data
def save_state_tax_data(state, data):
    with write_lock:
        if state == "California":
            return save_california_tax_data(data)
        if state == "New York":
            return save_new_york_data(data)
        
        state_data_dict = load_json_file(DATA_PATH, default_value={})
        
        logger.debug(f"Attempting to save data for {state}: {data}")
        
        if data:
            timestamp = datetime.now().isoformat()
            if state == "Iowa":
                formatted_data = {
                    "state": "Iowa",
                    "tax_info": []
                }
                for filing_status in ["single_filer", "married_filing_jointly"]:
                    for bracket in data.get(filing_status, []):
                        formatted_data["tax_info"].append({
                            "filing_status": filing_status,
                            "lower_limit": bracket["lower_limit"],
                            "upper_limit": bracket["upper_limit"],
                            "TY_2023": bracket["TY_2023"],
                            "TY_2024": bracket["TY_2024"],
                            "TY_2025": bracket["TY_2025"],
                            "TY_2026": bracket["TY_2026"]
                        })
                if data.get("note"):
                    formatted_data["tax_info"].append({"note": data["note"]})
                
                state_data_dict[state] = {
                    "timestamp": timestamp,
                    "data": formatted_data,
                    "source": "Local file parsing"
                }
            else:
                state_data_dict[state] = {
                    "timestamp": timestamp,
                    "data": data,
                    "source": "PDF parsing" if state == "California" else data.get("source", "Web scraping")
                }
            logger.info(f"Updated tax data for {state}")
        else:
            logger.warning(f"No data provided for {state}")
            return False

        try:
            with open(DATA_PATH, 'w') as outfile:
                json.dump(state_data_dict, outfile, indent=2)
            logger.info(f"Tax data for {state} saved to {DATA_PATH}.")
            return True
        except Exception as e:
            logger.error(f"Failed to save data for {state}: {e}")
            logger.exception("Full traceback:")
            return False
        

# Main function that processes states and marks failures
def main():
    # Ensure the Output directory exists
    output_dir = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/income_tax/modules/Output'
    os.makedirs(output_dir, exist_ok=True)
    
    log_file_path = os.path.join(output_dir, 'output.txt')

    # Set up logging to write to both console and file
    logging.basicConfig(level=logging.INFO,
                        format='%(asctime)s - %(levelname)s - %(message)s',
                        handlers=[
                            logging.FileHandler(log_file_path),
                            logging.StreamHandler(sys.stdout)
                        ])

    logger = logging.getLogger(__name__)
    logger.info("Script started")
    
    # Log the main function code
    logger.info("Main function code:")
    with open(__file__, 'r') as f:
        main_code = f.read()
    logger.info(main_code)
    
    # Your existing main function code here
    states_to_process = ["Alabama", "Arizona", "Utah", "California", "Colorado", "Connecticut", "Delaware", "Hawaii", "Idaho", "Iowa", "Illinois", "Indiana", "Kentucky", "Louisiana", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Montana", "Nebraska", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Pennsylvania", "West Virginia", "Wisconsin", "Virginia", "Vermont", "Rhode Island", "Oregon", "Missouri"]
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
            elif state == "Hawaii":
                state_data = fetch_hawaii_tax_data()
            elif state == "Iowa":
                logger.info("Processing Iowa")
                state_data = fetch_iowa_tax_data()
            elif state == "Illinois":
                state_data = fetch_illinois_tax_data()
            elif state == "Indiana":
                state_data = fetch_indiana_tax_data()
            elif state == "Kentucky":
                state_data = fetch_kentucky_tax_data()
            elif state == "Louisiana":
                state_data = fetch_louisiana_tax_data()
            elif state == "Maryland":
                state_data = fetch_maryland_tax_data()
            elif state == "Massachusetts":
                state_data = fetch_massachusetts_tax_data()
            elif state == "Michigan":
                state_data = fetch_michigan_tax_data()
            elif state == "Minnesota":
                state_data = fetch_minnesota_tax_data()
            elif state == "Mississippi":
                state_data = fetch_mississippi_tax_data()
            elif state == "Montana":
                state_data = fetch_montana_tax_data()
            elif state == "Nebraska":
                state_data = fetch_nebraska_tax_data()
            elif state == "New Jersey":
                state_data = fetch_new_jersey_tax_data()
                
            elif state == "New Mexico":
                state_data = fetch_new_mexico_tax_data()
            elif state == "New York":
                state_data = fetch_new_york_tax_data()
            elif state == "North Carolina":
                state_data = fetch_north_carolina_tax_data()
            elif state == "North Dakota":
                state_data = fetch_north_dakota_tax_data()
            elif state == "Ohio":
                state_data = fetch_ohio_tax_data()
            elif state == "Oklahoma":
                state_data = fetch_oklahoma_tax_data()
            elif state == "Pennsylvania":
                state_data = fetch_pennsylvania_tax_data()
            elif state == "West Virginia":
                state_data = fetch_west_virginia_tax_data()
            elif state == "Virginia":
                state_data = fetch_virginia_tax_data()
            elif state == "Vermont":
                state_data = fetch_vermont_tax_data()
            elif state == "Wisconsin":
                state_data = fetch_wisconsin_tax_data()
                
            elif state == "Rhode Island":
                state_data = fetch_rhode_island_tax_data()
            elif state == "Oregon":
                state_data = fetch_oregon_tax_data()
            elif state == "Missouri":
                state_data = fetch_missouri_tax_data()
            else:
                state_data = fetch_state_tax_data(state)

            # Check if valid data was fetched
            if state_data and (state_data.get("tax_info") or state_data.get("tax_brackets") or 
                               state_data.get("single_filer") or state_data.get("married_filing_jointly")):
                logger.info(f"Successfully fetched tax data for {state}")
                print(json.dumps(state_data, indent=2))
                if state == "California":
                    if save_california_tax_data(state_data):
                        successful_states.append(state)
                    else:
                        logger.error(f"Failed to save tax data for {state}")
                        failed_states.append(state)
                else:
                    if save_state_tax_data(state, state_data):
                        successful_states.append(state)
                    else:
                        logger.error(f"Failed to save tax data for {state}")
                        failed_states.append(state)
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
    summary = "\nSummary Report:\n"
    summary += f"Total states processed: {len(states_to_process)}\n"
    summary += f"Successful updates: {len(successful_states)} out of {len(states_to_process)}\n"
    summary += f"Failed updates: {len(failed_states)} out of {len(states_to_process)}\n"
    summary += f"States using manual data: {len(manual_data_states)} out of {len(states_to_process)}\n"
    
    if successful_states:
        summary += "\nSuccessfully updated states:\n"
        for state in successful_states:
            summary += f"- {state}\n"
    
    if failed_states:
        summary += "\nFailed states:\n"
        for state in failed_states:
            summary += f"- {state}\n"
    
    if manual_data_states:
        summary += "\nStates using manual data:\n"
        for state in manual_data_states:
            summary += f"- {state}\n"

    logger.info(summary)
    logger.info("Script completed")

if __name__ == "__main__":
    main()