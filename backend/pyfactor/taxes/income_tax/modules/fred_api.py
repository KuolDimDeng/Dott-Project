import requests
import json
import os

FRED_API_KEY = "your_fred_api_key"
FRED_API_URL = "https://api.stlouisfed.org/fred/series/observations"

def fetch_fred_data(series_id):
    params = {
        'series_id': series_id,
        'api_key': FRED_API_KEY,
        'file_type': 'json'
    }
    response = requests.get(FRED_API_URL, params=params)
    if response.status_code == 200:
        data = response.json()
        file_path = os.path.join(os.path.dirname(__file__), '..', 'data', f'{series_id}.json')
        with open(file_path, 'w') as outfile:
            json.dump(data, outfile)
        print(f"FRED data for {series_id} fetched and saved.")
    else:
        print(f"Failed to fetch FRED data for {series_id}")

if __name__ == "__main__":
    fetch_fred_data('UNRATE')  # Example: Fetch unemployment rate data