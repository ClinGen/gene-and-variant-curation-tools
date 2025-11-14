import src.parsers.clinvar_vcv_parser as vcv_parser

# Test valid VCV xml without giving SCV data
def test_vcv_only():
  xml_file = load_vcv_xml("vcv_001679524_v3")
  info_obj = vcv_parser.from_xml(xml_file)
  assert info_obj == {
    "variationId": "1679524",
    "variationName": "NM_001127222.2(CACNA1A):c.4031T>C (p.Leu1344Pro)" 
  }

# Test VCV xml without VariationArchive element
def test_missing_VariationArchive_file():
  xml_file = load_vcv_xml("vcv_missing_VariationArchive")
  info_obj = vcv_parser.from_xml(xml_file, "SCV003931172", "1")
  assert info_obj == {}

# Test VCV xml without ClinicalAssertionList element
def test_missing_ClinicalAssertionList_file():
  xml_file = load_vcv_xml("vcv_missing_ClinicalAssertionList")
  info_obj = vcv_parser.from_xml(xml_file, "SCV003931172", "1")
  assert info_obj == {}

# Test VCV xml with <ERROR> message
def test_error_file():
  xml_file = load_vcv_xml("vcv_error")
  info_obj = vcv_parser.from_xml(xml_file, "SCV003931172", "1")
  assert info_obj == {}

# Test VCV xml without given SCV
def test_scv_not_found():
  xml_file = load_vcv_xml("vcv_001679524_v3")
  info_obj = vcv_parser.from_xml(xml_file, "SCV003931172", "1")
  assert info_obj == {}

# Test VCV xml with given SCV but not given version
def test_scv_version_not_found():
  xml_file = load_vcv_xml("vcv_001679524_v3")
  info_obj = vcv_parser.from_xml(xml_file, "SCV003931173", "2")
  assert info_obj == {}

# Test returned submitter data for given VCV and SCV & version
def test_parses_submitter():
  xml_file = load_vcv_xml("vcv_001679524_v3")
  info_obj = vcv_parser.from_xml(xml_file, "SCV003931173", "1")
  assert info_obj["submitter"] == "GenomeConnect - Brain Gene Registry" 

# Test returned created date for given VCV and SCV & version
def test_parses_created_date_as_date():
  xml_file = load_vcv_xml("vcv_001679524_v3")
  info_obj = vcv_parser.from_xml(xml_file, "SCV003931173", "1")
  assert info_obj["date"] == "2023-06-17" 

# Test returned updated date for given VCV and SCV & version
def test_parses_last_updated_date_as_date():
  xml_file = load_vcv_xml("vcv_001679524_v3")
  info_obj = vcv_parser.from_xml(xml_file, "SCV004013412", "2")
  assert info_obj["date"] == "2023-07-22" 

# Test returned variant id for given VCV and SCV & version
def test_parses_variant_id():
  xml_file = load_vcv_xml("vcv_001679524_v3")
  info_obj = vcv_parser.from_xml(xml_file, "SCV003931173", "1")
  assert info_obj["variationId"] == "1679524"

# Test returned variant name for given VCV and SCV & version
def test_parses_variant_name():
  xml_file = load_vcv_xml("vcv_001679524_v3")
  info_obj = vcv_parser.from_xml(xml_file, "SCV003931173", "1")
  assert info_obj["variationName"] == "NM_001127222.2(CACNA1A):c.4031T>C (p.Leu1344Pro)"

# Test returned comment for given VCV and SCV & version
def test_parses_comment():
  xml_file = load_vcv_xml("vcv_001679524_v3")
  info_obj = vcv_parser.from_xml(xml_file, "SCV003931173", "1")
  assert info_obj["comment"] == "Variant classified as Likely pathogenic and reported on 12-16-2017 by GeneDx. Assertions are reported exactly as they appear on the patient provided laboratory report. GenomeConnect does not attempt to reinterpret the variant. The IDDRC-CTSA National Brain Gene Registry (BGR) is a study funded by the U.S. National Center for Advancing Translational Sciences (NCATS) and includes 13 Intellectual and Developmental Disability Research Center (IDDRC) institutions. The study is led by Principal Investigator Dr. Philip Payne?from Washington University. The BGR is a data commons of gene variants paired with subject clinical information. This database helps scientists learn more about genetic changes and their impact on the brain and behavior. Participation in the Brain Gene Registry requires participation in GenomeConnect. More information about the Brain Gene Registry can be found on the study website - https://braingeneregistry.wustl.edu/."

def load_vcv_xml(id):
  f_name = 'tests/data/' + id + '.xml'
  with open(f_name) as xml_f:
    xml_s = xml_f.read()

  return xml_s
