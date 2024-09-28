import os
import json
import unittest
import logging

# Logging setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Directory setup - dynamically calculate the path to the configuration file
current_file_dir = os.path.dirname(os.path.abspath(__file__))
config_path = os.path.join(current_file_dir, 'modules', 'state_tax_config.json')

# Load state tax configuration (URLs, settings)
STATE_CONFIG = {}

class TestStateTax(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        """Set up the test class by loading the configuration file."""
        logger.info(f"Current directory: {current_file_dir}")
        logger.info(f"Configuration file path: {config_path}")
        try:
            with open(config_path, 'r') as config_file:
                cls.STATE_CONFIG = json.load(config_file)
            logger.info("State tax configuration successfully loaded.")
        except FileNotFoundError:
            logger.error(f"Configuration file not found at {config_path}")
            cls.STATE_CONFIG = {}
        except Exception as e:
            logger.error(f"An error occurred while loading the configuration file: {e}")
            cls.STATE_CONFIG = {}

    def test_config_loaded(self):
        """Test to ensure that the state tax configuration is loaded properly."""
        self.assertIsInstance(self.STATE_CONFIG, dict, "STATE_CONFIG should be a dictionary")
        self.assertTrue(len(self.STATE_CONFIG) > 0, "STATE_CONFIG should not be empty")

    def test_california_tax_exists(self):
        """Test to check if California tax data exists in the configuration."""
        self.assertIn('California', self.STATE_CONFIG, "California tax data should exist in the configuration")
    
    def test_new_york_tax_exists(self):
        """Test to check if New York tax data exists in the configuration."""
        self.assertIn('New York', self.STATE_CONFIG, "New York tax data should exist in the configuration")

    def test_california_tax_url(self):
        """Test to check if California's tax URL is present and valid."""
        california_data = self.STATE_CONFIG.get('California', {})
        self.assertIn('url', california_data, "California tax data should have a URL")
        self.assertTrue(california_data['url'].startswith("http"), "California tax URL should start with http")

if __name__ == '__main__':
    unittest.main()
