import json
import pytest

from src.authorization.authorizer import Authorizer

@pytest.fixture
def admin_key_info():
    return {
        'api_key_value': 'TESTAPIKEY-VALUE',
        'roles': ['admin'],
        'affiliations': ['10007']
    }

@pytest.fixture
def curator_key_info():
    return {
        'api_key_value': 'TESTAPIKEY-VALUE',
        'roles': ['curator'],
        'affiliations': []
    }

@pytest.fixture
def affiliation():
    return '10007'

@pytest.fixture
def affiliation_key_info(affiliation):
    return {
        'api_key_value': 'TESTAPIKEY-VALUE',
        'roles': ['curator'],
        'affiliations': [affiliation]
    }

@pytest.fixture
def affiliations_api_event():
    return {
        'path': '/affiliations'
    }

@pytest.fixture
def query_string_affiliation_event(affiliation):
    return {
        'path': "",
        'queryStringParameters': {
            'affiliation': affiliation
        }
    }

@pytest.fixture
def authorizer():
    return Authorizer()

def test_affiliations_resource_admin_access(admin_key_info, affiliations_api_event, query_string_affiliation_event, authorizer):
    assert authorizer.authorize(admin_key_info, affiliations_api_event) == True
    assert authorizer.authorize(admin_key_info, query_string_affiliation_event) == True

def test_affiliations_resource_reject_non_admin(curator_key_info, affiliations_api_event, authorizer):
    assert authorizer.authorize(curator_key_info, affiliations_api_event) == False

def test_query_string_affiliation(curator_key_info, affiliation_key_info, query_string_affiliation_event, authorizer):
    assert authorizer.authorize(curator_key_info, query_string_affiliation_event) == False
    assert authorizer.authorize(affiliation_key_info, query_string_affiliation_event) == True