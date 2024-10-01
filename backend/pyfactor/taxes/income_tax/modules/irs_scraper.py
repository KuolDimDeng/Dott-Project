import logging
import requests
import pdfplumber
import re
import io
import json
from requests.adapters import HTTPAdapter
from requests.exceptions import Timeout, ConnectionError, HTTPError
from urllib3.util.retry import Retry

# Set up logging
logger = logging.getLogger(__name__)

def make_request_with_retry(url, retries=3, backoff_factor=0.3, timeout=10):
    session = requests.Session()
    retry_strategy = Retry(
        total=retries,
        status_forcelist=[500, 502, 503, 504],
        allowed_methods=["HEAD", "GET", "OPTIONS"],
        backoff_factor=backoff_factor
    )
    
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    session.mount("http://", adapter)

    try:
        response = session.get(url, timeout=timeout)
        response.raise_for_status()
        return response
    except (Timeout, ConnectionError, HTTPError) as e:
        logger.error(f"HTTP request failed: {e}")
        raise

def extract_tax_data(text):
    """
    Extract tax rates, tax brackets, and deductions from the IRS PDF text using regex.
    Handles multiple formats of tax descriptions.
    """
    logger.info("Extracting tax rates, tax brackets, and deductions from the text...")
    
    # List of regex patterns for Social Security rate
    ss_rate_patterns = [
        r"social security tax rate is ([\d.]+)%",
        r"rate for social security is ([\d.]+)%"  
    ]

    medicare_rate_patterns = [
        r"medicare tax rate is ([\d.]+)%",
        r"rate for medicare is ([\d.]+)%"
    ]

    futa_rate_patterns = [
        r"FUTA tax rate is ([\d.]+)%"
    ]

    # Regex patterns for tax brackets (example for single filers)
    tax_brackets_patterns = [
        r"Single filers:\s*\$?([\d,]+)\s*to\s*\$?([\d,]+)\s*at\s*([\d.]+)%",
        r"Married filing jointly:\s*\$?([\d,]+)\s*to\s*\$?([\d,]+)\s*at\s*([\d.]+)%"
    ]
    
    # Regex patterns for deductions (example standard deduction)
    deduction_patterns = [
        r"Standard deduction for single filers is \$([\d,]+)",
        r"Standard deduction for married filing jointly is \$([\d,]+)"
    ]

    # Extract rates
    ss_rate_match = search_patterns(ss_rate_patterns, text)
    medicare_rate_match = search_patterns(medicare_rate_patterns, text)
    futa_rate_match = search_patterns(futa_rate_patterns, text)

    # Extract tax brackets
    tax_brackets = extract_tax_brackets(text, tax_brackets_patterns)

    # Extract deductions
    deductions = extract_deductions(text, deduction_patterns)

    return {
        "fica": {
            "social_security": float(ss_rate_match) / 100 if ss_rate_match else None,
            "medicare": float(medicare_rate_match) / 100 if medicare_rate_match else None
        },
        "futa": {
            "rate": float(futa_rate_match) / 100 if futa_rate_match else None
        },
        "tax_brackets": tax_brackets,
        "deductions": deductions
    }

def scrape_federal_tax_data():
    """
    Fetch and parse tax data from the IRS PDF and save it to a file.
    """
    try:
        logger.info("Fetching the federal tax data from IRS...")
        url = "https://www.irs.gov/pub/irs-pdf/p15.pdf"

        # Make the request with retries for network instability
        response = make_request_with_retry(url)

        # Convert the PDF content (bytes) into a file-like object using BytesIO
        pdf_file = io.BytesIO(response.content)

        # Try to parse the PDF
        with pdfplumber.open(pdf_file) as pdf:
            text = ""
            for page in pdf.pages:
                try:
                    page_text = page.extract_text()
                    if not page_text:
                        raise ValueError("Empty or corrupted PDF page")
                    text += page_text
                except Exception as e:
                    logger.error(f"Failed to extract text from page: {e}")
                    continue  # Skip the page and continue

        if not text.strip():
            logger.error("The PDF is empty or contains no valid text.")
            return None

        logger.debug(f"Extracted PDF text: {text[:500]}")  # Log first 500 characters

        # Extract tax data from the PDF text
        federal_tax_data = extract_tax_data(text)

        # If all extracted data is None or empty, return None
        if not any(federal_tax_data.values()):
            logger.error("No valid tax data extracted from the PDF.")
            return None

        # Save the data to a file
        save_data_to_file(federal_tax_data)

        return federal_tax_data

    except requests.RequestException as e:
        logger.error(f"Network error while fetching IRS data: {e}")
        return None
    except Exception as e:
        logger.error(f"Failed to process PDF: {e}")
        return None


def extract_tax_brackets(text, patterns):
    """
    Extract tax brackets using regex patterns.
    """
    logger.info("Extracting tax brackets from the text...")
    brackets = {
        "single": [],
        "married_jointly": []
    }

    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if not matches:
            logger.warning(f"No matches found for pattern: {pattern}")
        for match in matches:
            income_min = int(match[0].replace(",", "").replace("$", ""))  # Remove commas and dollar signs
            income_max = int(match[1].replace(",", "").replace("$", ""))
            rate = float(match[2]) / 100
            if "single" in pattern.lower():
                brackets["single"].append([income_min, income_max, rate])
            elif "married" in pattern.lower():
                brackets["married_jointly"].append([income_min, income_max, rate])
            logger.debug(f"Matched tax bracket: {income_min} to {income_max} at {rate}")

    return brackets

def extract_deductions(text, patterns):
    """
    Extract deductions using regex patterns.
    """
    logger.info("Extracting deductions from the text...")
    deductions = {}
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            deduction_amount = int(match.group(1).replace(",", ""))  # Remove commas
            if "single" in pattern.lower():
                deductions["single"] = deduction_amount
            elif "married" in pattern.lower():
                deductions["married_jointly"] = deduction_amount
            logger.debug(f"Matched deduction: {deduction_amount} for {pattern}")
        else:
            logger.warning(f"No matches found for pattern: {pattern}")
    return deductions

def search_patterns(patterns, text):
    """
    Search through multiple regex patterns and return the first match found.
    """
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1)
    return None

def save_data_to_file(data, file_path="/Users/kuoldeng/projectx/backend/pyfactor/taxes/data/federal_tax_data.json"):
    """
    Save the parsed federal tax data to a JSON file.
    """
    try:
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=4)
        logger.info(f"Tax data successfully saved to {file_path}")
    except IOError as e:
        logger.error(f"Failed to save data to file: {e}")

if __name__ == "__main__":
    data = scrape_federal_tax_data()
    if data:
        print("Federal tax data scraped and saved successfully.")
    else:
        print("Failed to scrape federal tax data.")
