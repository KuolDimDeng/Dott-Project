import json
import os

def load_cached_data(file_name):
    current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    file_path = os.path.join(current_dir, 'data', file_name)
    if os.path.exists(file_path):
        with open(file_path, 'r') as infile:
            return json.load(infile)
    return None

def cache_data(data, file_name):
    current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(current_dir, 'data')
    os.makedirs(data_dir, exist_ok=True)
    file_path = os.path.join(data_dir, file_name)
    with open(file_path, 'w') as outfile:
        json.dump(data, outfile, indent=2)