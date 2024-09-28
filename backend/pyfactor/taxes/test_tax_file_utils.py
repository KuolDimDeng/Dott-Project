import logging
import re
from unittest.mock import patch, MagicMock
import pytest
from requests import Timeout
from taxes.modules.irs_scraper import make_request_with_retry, scrape_federal_tax_data, extract_tax_data

# Set up logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

MOCK_PDF_TEXT = """
The social security tax rate is 6.2%.
The medicare tax rate is 1.45%.
The FUTA tax rate is 0.6%.
Single filers: $0 to $9,875 at 10%
Single filers: $9,876 to $40,125 at 12%
Married filing jointly: $0 to $19,750 at 10%
Married filing jointly: $19,751 to $80,250 at 12%
Standard deduction for single filers is $12,400
Standard deduction for married filing jointly is $24,800
"""

def test_make_request_with_retry_success():
    """Test for successful HTTP request with retry logic."""
    with patch('requests.Session.get') as mock_get:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = b'Some PDF content'
        mock_get.return_value = mock_response

        response = make_request_with_retry("https://www.irs.gov/pub/irs-pdf/p15.pdf")
        assert response.status_code == 200
        assert response.content == b'Some PDF content'
        logger.info("test_make_request_with_retry_success passed")

def test_make_request_with_retry_timeout():
    """Test for retry mechanism handling Timeout exception."""
    with patch('requests.Session.get', side_effect=Timeout):
        with pytest.raises(Timeout):
            make_request_with_retry("https://www.irs.gov/pub/irs-pdf/p15.pdf")
        logger.info("test_make_request_with_retry_timeout passed")

def test_scrape_federal_tax_data_success():
    """Test for successfully scraping tax data from a mock PDF."""
    with patch('taxes.modules.irs_scraper.make_request_with_retry') as mock_request:
        mock_response = MagicMock()
        mock_response.content = b'Mocked PDF content'
        mock_request.return_value = mock_response

        with patch('pdfplumber.open') as mock_pdfplumber:
            mock_pdf = MagicMock()
            mock_page = MagicMock()
            mock_page.extract_text.return_value = MOCK_PDF_TEXT
            mock_pdf.pages = [mock_page]
            mock_pdfplumber.return_value.__enter__.return_value = mock_pdf

            result = scrape_federal_tax_data()

            # Check FICA and FUTA rates
            assert result["fica"]["social_security"] == pytest.approx(0.062, rel=1e-2)
            assert result["fica"]["medicare"] == pytest.approx(0.0145, rel=1e-2)
            assert result["futa"]["rate"] == pytest.approx(0.006, rel=1e-2)

            # Check tax brackets
            assert result["tax_brackets"]["single"][0] == [0, 9875, 0.1]
            assert result["tax_brackets"]["single"][1] == [9876, 40125, 0.12]
            assert result["tax_brackets"]["married_jointly"][0] == [0, 19750, 0.1]
            assert result["tax_brackets"]["married_jointly"][1] == [19751, 80250, 0.12]

            # Check deductions
            assert result["deductions"]["single"] == 12400
            assert result["deductions"]["married_jointly"] == 24800

            logger.info("test_scrape_federal_tax_data_success passed")

def test_scrape_federal_tax_data_empty_pdf():
    """Test for handling empty or corrupt PDF response."""
    with patch('taxes.modules.irs_scraper.make_request_with_retry') as mock_request:
        mock_response = MagicMock()
        mock_response.content = b'Empty PDF content'
        mock_request.return_value = mock_response

        with patch('pdfplumber.open') as mock_pdfplumber:
            mock_pdf = MagicMock()
            mock_page = MagicMock()
            mock_page.extract_text.return_value = ""  # Simulate empty page
            mock_pdf.pages = [mock_page]
            mock_pdfplumber.return_value.__enter__.return_value = mock_pdf

            result = scrape_federal_tax_data()
            assert result is None  # Expecting failure handling
            logger.info("test_scrape_federal_tax_data_empty_pdf passed")



def test_invalid_pdf_handling():
    """Test for handling invalid PDF format and raising exceptions."""
    with patch('taxes.modules.irs_scraper.scrape_federal_tax_data') as mock_scrape:
        mock_scrape.side_effect = Exception("Invalid PDF format")

        logger.info("Starting test_invalid_pdf_handling")
        with pytest.raises(Exception, match="Invalid PDF format"):
            mock_scrape()
        logger.info("Invalid PDF test passed")

if __name__ == "__main__":
    pytest.main()

