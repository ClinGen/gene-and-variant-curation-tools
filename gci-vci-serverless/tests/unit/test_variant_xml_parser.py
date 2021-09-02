import src.parsers.variant_xml_parser as test_parser

import json

def test_empty_result_set_returns_none():
  xml_s = load_variant_xml('empty')

  act_obj = test_parser.from_xml(xml_s)
  assert None == act_obj

def test_parses_variant_id():
  xml_s = load_variant_xml('12000')
  
  act_obj = test_parser.from_xml(xml_s)
  assert '12000' == act_obj['clinvarVariantId'], 'Variant ID does not match'

def test_parses_variant_title():
  xml_s = load_variant_xml('12000')
  
  act_obj = test_parser.from_xml(xml_s)
  assert 'NM_000151.4(G6PC):c.1039C>T (p.Gln347Ter)' == act_obj['clinvarVariantTitle']

def test_parses_variant_car_id():
  xml_s = load_variant_xml('12000')
  
  act_obj = test_parser.from_xml(xml_s)
  assert 'CA256179' == act_obj['carId']

def test_parses_hgvs_names():
  xml_s = load_variant_xml('12000')

  exp_hgvs_names = {
    "others": [
      "NM_000151.4:c.1039C>T",
      "NP_000142.2:p.Gln347Ter",
      "NM_001270397.2:c.*431C>T",
      "LRG_147t1:c.1039C>T",
      "LRG_147p1:p.Gln347Ter",
      "NG_011808.1:g.15594C>T",
      "LRG_147:g.15594C>T",
      "NP_000142.1:p.Gln347Ter"
    ],
    "GRCh37": "NC_000017.10:g.41063408C>T",
    "GRCh38": "NC_000017.11:g.42911391C>T"
  }

  act_obj = test_parser.from_xml(xml_s)
  
  assert exp_hgvs_names == act_obj['hgvsNames']

def test_parses_molecular_consequences_list():
  xml_s = load_variant_xml('12000')

  exp_molecular_consequences = [
    {
      "hgvsName": "NM_000151.4:c.1039C>T",
      "term": "nonsense",
      "soId": "SO:0001587"
    },
    {
      "hgvsName": "NM_001270397.2:c.*431C>T",
      "term": "3 prime UTR variant",
      "soId": "SO:0001624"
    }
  ]

  act_obj = test_parser.from_xml(xml_s)

  assert exp_molecular_consequences == act_obj['molecularConsequenceList']
 
def load_variant_xml(id_s):
  f_name = 'tests/data/variant_' + id_s + '.xml'
  with open(f_name) as xml_f:
    xml_s = xml_f.read()

  return xml_s
