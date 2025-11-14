"""
This file tests all the affiliations helper methods in affiliation_helpers.py
"""

import os
from unittest.mock import patch, Mock
from src.helpers import affiliation_helpers
import unittest


DETAIL_RESPONSE = [
    {
        'affiliation_id': '10000',
        'affiliation_fullname': 'Test Admin GCEP/VCEP',
        'subgroups': {
            'gcep': {
                'id': '40000',
                'fullname': 'GCI Admin test'
            },
            'vcep': {
                'id': '50000',
                'fullname': 'VCI Admin test'
            }
        }
    }
]

FULL_RESPONSE = DETAIL_RESPONSE + [
    {
        'affiliation_id': '10001',
        'affiliation_fullname': 'Affiliation Test Name GCEP',
        'subgroups': {
            'gcep': {
                'id': '40001',
                'fullname': 'GCEP Test Name'
            }
        }
    }
]

@patch('src.helpers.affiliation_helpers.get_affils_api_config')
def test_load_affiliation_data_success(mock_get_config):
    """Test that all Affiliations are in the full Affiliations API response."""
    mock_get_config.return_value = {
        'url': 'https://example.com',
        'api_key': 'api_key'
    }

    with patch("src.helpers.affiliation_helpers.requests.get") as mock_get:
        mock_get_response = Mock()
        mock_get_response.status_code = 200
        mock_get_response.json.return_value = FULL_RESPONSE
        mock_get.return_value = mock_get_response

        affiliation_helpers.load_affiliation_data()
        affiliations = affiliation_helpers.affiliation_data

        mock_get.assert_called_once()
        assert any(affil['affiliation_id'] ==
                '10001' for affil in affiliations), 'Error test_load_affiliation_data: Affiliation not found in API response.'
        assert len(
            affiliations) > 0, 'Error test_load_affiliation_data: No affiliations return in API response.'

@patch('src.helpers.affiliation_helpers.get_affils_api_config')
def test_load_affiliation_detail(mock_get_config):
    """Test if specific Affiliations object is in the full Affiliations API response."""
    mock_get_config.return_value = {
        'url': 'https://example.com',
        'api_key': 'api_key'
    }
    with patch("src.helpers.affiliation_helpers.requests.get") as mock_get:
        mock_get_response = Mock()
        mock_get_response.status_code = 200
        mock_get_response.json.return_value = DETAIL_RESPONSE
        mock_get.return_value = mock_get_response

        affiliation_helpers.load_affiliation_detail('10000')
        affiliation_detail = affiliation_helpers.affiliation_detail
        assert affiliation_detail == DETAIL_RESPONSE, 'Error test_load_affiliation_detail: Affiliation not the same in API response.'

@patch('src.helpers.affiliation_helpers.get_affils_api_config')
def test_lookup_affiliation_detail(mock_get_config):
    """Test if specific key is in a specific affiliations object in full Affiliations API response."""
    mock_get_config.return_value = {
        'url': 'https://example.com',
        'api_key': 'api_key'
    }
    with patch("src.helpers.affiliation_helpers.requests.get") as mock_get:
        mock_get_response = Mock()
        mock_get_response.status_code = 200
        mock_get_response.json.return_value = DETAIL_RESPONSE
        mock_get.return_value = mock_get_response

        affiliation_fullname = affiliation_helpers.lookup_affiliation_data(
            '10000', 'fullname', 'vcep')
        assert affiliation_fullname == 'VCI Admin test', 'Error test_lookup_affiliation_detail: Affiliation fullname not the same in API response.'

class TestAffilsAPIConfig(unittest.TestCase):
    """Class for all API config functions."""
    @patch('src.helpers.affiliation_helpers._get_env_variable_or_fail')
    def test_get_affils_api_config__prod(self, mock_get_env_var):
        """Test if prod key is returned."""
        
        mock_get_env_var.side_effect = [
            'prod', #APP_STAGE
            'https://prod.example.com',
            'prod_api_key',
            ]

        config = affiliation_helpers.get_affils_api_config()
        self.assertEqual(config['url'], 'https://prod.example.com')
        self.assertEqual(config['api_key'], 'prod_api_key')
    
    @patch('src.helpers.affiliation_helpers._get_env_variable_or_fail')
    def test_get_affils_api_config__dev(self, mock_get_env_var):
        """Test if dev key is returned."""

        mock_get_env_var.side_effect = [
            'dev', #APP_STAGE
            'https://dev.example.com',
            'dev_api_key',
            ]

        config = affiliation_helpers.get_affils_api_config()
        self.assertEqual(config['url'], 'https://dev.example.com')
        self.assertEqual(config['api_key'], 'dev_api_key')

    def test__get_env_variable_or_fail__missing(self):
        """Test that _get_env_variable_or_fail raises KeyError when missing."""
        with self.assertRaises(KeyError) as context:
            affiliation_helpers._get_env_variable_or_fail('MISSING_KEY')
        self.assertIn('MISSING_KEY not set in environment', str(context.exception))
