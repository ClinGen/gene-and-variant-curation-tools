import json
import pytest

import src.clients.car_client as test_car_client

@pytest.fixture(scope='module')
def ldh_data():
  f_name = 'tests/data/ldh_data.json'
  with open(f_name) as json_f:
    json_s = json_f.read()

  return json.loads(json_s)

@pytest.fixture(scope='module')
def genome_data():
  f_name = 'tests/data/genome_data.json'
  with open(f_name) as json_f:
    json_s = json_f.read()

  return json.loads(json_s)

def test_parses_variant_car_id():
  test_data = load_variant_json('CA256179')

  act_obj =  test_car_client.decode_response_obj(test_data)
  assert 'CA256179' == act_obj['carId'], 'CAR ID does not match'

def test_parses_variant_clinvar_variant_id():
  test_data = load_variant_json('CA256179')

  act_obj = test_car_client.decode_response_obj(test_data)
  assert '12000' == act_obj['clinvarVariantId'], 'ClinVar Variant ID does not match'

def test_parses_variant_dbsnp():
  test_data = load_variant_json('CA256179')

  act_obj = test_car_client.decode_response_obj(test_data)
  assert ['80356487'] == act_obj['dbSNPIds'], 'dbSNPIds do not match'

def test_parses_genomic_and_transcript_alleles():
  test_data = load_variant_json('CA256179')

  exp_hgvs_names = { 
    'others': [
      'NG_011808.1:g.15594C>T', 
      'LRG_147:g.15594C>T', 
      'NM_000151.3:c.1039C>T',
      'NM_001270397.1:c.*431C>T',
      'NM_000151.4:c.1039C>T',
      'NM_001270397.2:c.*431C>T',
      'ENST00000253801.6:c.1039C>T',
      'ENST00000585489.1:c.*431C>T'
    ],
    'GRCh38': 'NC_000017.11:g.42911391C>T',
    'GRCh37': 'NC_000017.10:g.41063408C>T',
    'NCBI36': 'NC_000017.9:g.38316934C>T',
  }

  act_obj = test_car_client.decode_response_obj(test_data)
  assert act_obj['hgvsNames'] == exp_hgvs_names, 'HGVS Names do not match'

def test_parses_genomic_and_transcript_and_amino_acid_alleles():
  pass

def test_parses_mane_transcript_title_from_genomic_data(genome_data):
  act_mane_transcript_title = test_car_client.parse_mane_transcript_title_from_genomic_car(genome_data)
  assert act_mane_transcript_title == 'NM_002496.4'

def test_parse_mane_transcript_title_from_ldh_data(ldh_data):
  act_title = test_car_client.parse_mane_transcript_title_from_ldh(ldh_data)
  assert act_title == 'NM_000257.4', 'Mane transcript title does not match'

def load_variant_json(car_id):
  f_name = 'tests/data/variant_' + car_id + '.json'
  with open(f_name) as json_f:
    json_s = json_f.read()

  return json.loads(json_s)