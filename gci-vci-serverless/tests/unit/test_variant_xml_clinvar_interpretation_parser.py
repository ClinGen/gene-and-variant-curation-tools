import json

from src.parsers.variant_xml_clinvar_interpretation_parser import from_xml as clinvar_interpretation_parser

from tests.unit.test_variant_xml_parser import load_variant_xml as load_clinvar_variant_xml

"""
How to run this test using pytest:
1. Make sure you are at gci-vci-serverless/
2. Run `python -m pytest tests/unit/test_variant_xml_clinvar_interpretation_parser.py`
3. Or, to run all test files, run `python -m pytest tests`

Use -s to show your debug logs
"""


def test_clinvar_interpretation_scvs():
  match_clinvar_interpretation_scvs_helper('55962')
  match_clinvar_interpretation_scvs_helper('10')


def match_clinvar_interpretation_scvs_helper(clinvar_id):
  xml = load_clinvar_variant_xml(clinvar_id)

  test_clinvar_interpretation_scv = clinvar_interpretation_parser(xml)

  clinvar_interpretation_scv = load_interpretation_scv_json(clinvar_id)

  assert test_clinvar_interpretation_scv['clinvarInterpretationSummary'] == clinvar_interpretation_scv['clinvarInterpretationSummary']

  assert len(test_clinvar_interpretation_scv['clinvarInterpretationSCVs']) == len(clinvar_interpretation_scv['clinvarInterpretationSCVs'])

  for test_scv in test_clinvar_interpretation_scv['clinvarInterpretationSCVs']:
    scv = list(filter(lambda scv: scv['accession'] == test_scv['accession'], clinvar_interpretation_scv['clinvarInterpretationSCVs']))
    assert len(scv) == 1

    scv = scv[0]

    # python will match dict, not 
    assert scv == test_scv

def load_interpretation_scv_json(clinvar_id) -> dict:
  f_name = 'tests/data/variant_{}_interpretation_scv.json'.format(clinvar_id)
  with open(f_name) as json_file:
    return json.load(json_file)
