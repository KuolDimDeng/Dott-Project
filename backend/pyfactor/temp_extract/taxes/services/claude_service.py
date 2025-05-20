# taxes/services/claude_service.py
import requests
import logging
import json
from datetime import datetime, timedelta
from django.conf import settings
from taxes.models import State, IncomeTaxRate

logger = logging.getLogger(__name__)

class ClaudeComplianceService:
    """Service to fetch tax compliance requirements using Claude API"""
    
    API_URL = "https://api.anthropic.com/v1/messages"
    
    @staticmethod
    def get_country_compliance_requirements(country_code):
        """
        Get tax compliance requirements for a country using Claude
        """
        try:
            headers = {
                "Content-Type": "application/json",
                "X-API-Key": settings.CLAUDE_API_KEY,
                "anthropic-version": "2023-06-01"
            }
            
            prompt = f"""
            Please provide the payroll tax compliance requirements for {country_code}.
            Include:
            1. Required payroll tax deductions
            2. Filing frequency
            3. Tax authority information
            4. Any special considerations
            
            Format the response as JSON with the following structure:
            ```json
            {{
                "country": "{country_code}",
                "tax_deductions": [
                    {{"name": "Income Tax", "type": "percentage", "rate": 0.2}},
                    {{"name": "Social Security", "type": "fixed", "rate": 100}}
                ],
                "filing_frequency": "monthly",
                "tax_authorities": [
                    {{"name": "Tax Authority Name", "website": "https://example.com"}}
                ],
                "special_considerations": "Any special notes",
                "service_level_recommendation": "full|self"
            }}
            ```
            Only return the JSON, no additional text.
            """
            
            payload = {
                "model": "claude-3-opus-20240229",
                "max_tokens": 1000,
                "messages": [{"role": "user", "content": prompt}]
            }
            
            response = requests.post(
                ClaudeComplianceService.API_URL,
                headers=headers,
                json=payload
            )
            
            if response.status_code == 200:
                data = response.json()
                response_content = data['content'][0]['text']
                
                # Extract JSON from the response
                json_start = response_content.find('{')
                json_end = response_content.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    json_str = response_content[json_start:json_end]
                    return json.loads(json_str)
                else:
                    logger.error(f"Couldn't extract JSON from Claude response: {response_content}")
                    return None
            else:
                logger.error(f"Claude API error: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Error fetching compliance requirements: {str(e)}")
            return None
    
    @staticmethod
    def get_tax_rates(country_code, state_code=None, tax_year=None):
        """
        Get tax rates for a country or state using Claude
        """
        try:
            headers = {
                "Content-Type": "application/json",
                "X-API-Key": settings.CLAUDE_API_KEY,
                "anthropic-version": "2023-06-01"
            }
            
            if not tax_year:
                tax_year = datetime.now().year
                
            location = f"state/province {state_code} in {country_code}" if state_code else f"{country_code}"
            
            prompt = f"""
            Please provide the tax rates for {location} for the tax year {tax_year}.
            Include income tax brackets, payroll taxes, and any other relevant tax rates.
            
            Format the response as JSON with the following structure:
            ```json
            {{
                "country": "{country_code}",
                "state": "{state_code if state_code else ''}",
                "tax_year": {tax_year},
                "income_tax": [
                    {{"min": 0, "max": 10000, "rate": 0.1, "filing_status": "single"}},
                    {{"min": 10001, "max": 50000, "rate": 0.15, "filing_status": "single"}}
                ],
                "payroll_taxes": [
                    {{"name": "Social Security", "rate": 0.062, "wage_base": 160200}}
                ],
                "is_flat_rate": false
            }}
            ```
            Only return the JSON, no additional text.
            """
            
            payload = {
                "model": "claude-3-opus-20240229",
                "max_tokens": 1000,
                "messages": [{"role": "user", "content": prompt}]
            }
            
            response = requests.post(
                ClaudeComplianceService.API_URL,
                headers=headers,
                json=payload
            )
            
            if response.status_code == 200:
                data = response.json()
                response_content = data['content'][0]['text']
                
                # Extract JSON from the response
                json_start = response_content.find('{')
                json_end = response_content.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    json_str = response_content[json_start:json_end]
                    return json.loads(json_str)
                else:
                    logger.error(f"Couldn't extract JSON from Claude response: {response_content}")
                    return None
            else:
                logger.error(f"Claude API error: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Error fetching tax rates: {str(e)}")
            return None