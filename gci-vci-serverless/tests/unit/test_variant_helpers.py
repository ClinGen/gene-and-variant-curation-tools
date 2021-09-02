import json
import os

import src.helpers.variant_helpers.hgvs_notation as hgvs_notation_helpers
from src.helpers.variant_helpers.primary_transcript import get_primary_transcript
from src.helpers.variant_helpers.variant_title import preferred_title_for
import src.parsers.variant_xml_parser as clinvar_parser
from src.clients.ensembl_vep_client import get_refseq_transcripts_from_ensembl_vep
from src.clients.car_client import decode_response_obj

from tests.unit.test_variant_xml_parser import load_variant_xml as load_clinvar_variant_xml
from tests.unit.test_ensembl_vep_client import load_variant_json as load_ensembl_vep_json
from tests.unit.test_car_client import load_variant_json as load_car_json

"""
How to run this test using pytest:
1. Make sure you are at gci-vci-serverless/
2. Run `python -m pytest tests/unit/test_variant_helpers.py`
3. Or, to run all test files, run `python -m pytest tests`
"""


def test_get_hgvs_notation():
    '''
        Test a clinvar variant
    '''

    xml = load_clinvar_variant_xml('550731')
    variant = clinvar_parser.from_xml(xml)
    print('variant', variant)
    hgvs_notation = hgvs_notation_helpers.get_hgvs_notation(variant, 'GRCh38', True)
    assert hgvs_notation == '1:g.45508802_45508816del'
    
    '''
        Test a CAR variant
    '''

    car_object = load_car_json('CA913175340')
    variant = decode_response_obj(car_object)
    hgvs_notation = hgvs_notation_helpers.get_hgvs_notation(variant, 'GRCh38', True)
    assert hgvs_notation == ''


def test_get_primary_transcript():
    clinvar_id = '550731'
    xml = load_clinvar_variant_xml(clinvar_id)
    variant, variant_extension = clinvar_parser.from_xml(xml, True)
    hgvs_notation = hgvs_notation_helpers.get_hgvs_notation(variant, 'GRCh38', True)
    ensembl_vep_data = load_ensembl_vep_json(hgvs_notation)
    refseq_transcripts_from_ensembl_vep = get_refseq_transcripts_from_ensembl_vep(ensembl_vep_data['transcript_consequences'])

    primary_transcript = get_primary_transcript(variant, variant_extension, refseq_transcripts_from_ensembl_vep)

    assert primary_transcript['nucleotide'] == 'NM_015506.3:c.436_450del'
    assert primary_transcript['exon'] == '4/4'
    assert primary_transcript['protein'] == 'NP_056321.2:p.Ser146_Ile150del'
    assert primary_transcript['molecular'] == 'inframe_deletion SO:0001822'


def test_preferred_title_for_clinvar_variant():
    clinvar_id = '550731'
    xml = load_clinvar_variant_xml(clinvar_id)
    variant, variant_extension = clinvar_parser.from_xml(xml, True)
    hgvs_notation = hgvs_notation_helpers.get_hgvs_notation(variant, 'GRCh38', True)
    ensembl_vep_data = load_ensembl_vep_json(hgvs_notation)

    # this test case matches a MANE title
    assert preferred_title_for(variant, ensembl_vep_data['transcript_consequences'], gene_source_from_clinvar_variant_extension=variant_extension) == 'NM_015506.3(MMACHC):c.436_450del (p.Ser146_Ile150del)'


def test_preferred_title_for_car_variant():
    '''
        Test for CA501058
    '''

    car_id = 'CA501058'
    car_object = load_car_json(car_id)
    assert 'transcriptAlleles' in car_object
    variant = decode_response_obj(car_object)
    assert 'hgvsNames' in variant

    hgvs_notation = hgvs_notation_helpers.get_hgvs_notation(variant, 'GRCh38', True)
    assert hgvs_notation == 'X:g.102654175T>C'
    ensembl_vep_data = load_ensembl_vep_json(hgvs_notation)
    assert 'transcript_consequences' in ensembl_vep_data and isinstance(ensembl_vep_data['transcript_consequences'], list)

    # this test case contains multiple genes, and thus shall fall back to hgvs names (no clinvar title in this case)
    assert preferred_title_for(variant, ensembl_vep_data['transcript_consequences'], car_data=car_object) == 'NC_000023.11:g.102654175T>C (GRCh38)'

    '''
        Test for CA913175340
    '''

    car_id = 'CA913175340'
    car_object = load_car_json(car_id)
    variant = decode_response_obj(car_object)
    assert 'hgvsNames' in variant

    hgvs_notation = hgvs_notation_helpers.get_hgvs_notation(variant, 'GRCh38', True)
    assert hgvs_notation == ''
    ensembl_vep_transcripts = []

    # this variant cannot be found in Ensembl VEP (since it doesn't have a valid hgvs_notation), and should fallback to use GRCh38
    assert preferred_title_for(variant, ensembl_vep_transcripts, car_data=car_object) == 'NC_012920.1:m.15974A>G (GRCh38)'


def test_get_preferred_title_for_migrated_variant():
    # TODO: this test involves an API call to CAR API, so may fail if CAR API is down;
    # may improve the way to test in the future
    os.environ.setdefault('CAR_ALLELE_ENDPOINT', 'https://reg.genome.network/allele/')
    os.environ.setdefault('DB_TABLE_NAME', 'GeneVariantCuration-dev')
    os.environ.setdefault('ENSEMBL_VEP_HGVS_ENDPOINT', 'https://rest.ensembl.org/vep/human/hgvs/')
    os.environ.setdefault('CLIN_VAR_EUTILS_VCV_ENDPOINT', 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?api_key=&db=clinvar&rettype=vcv&is_variationid&from_esearch=true&id=')
    # have to import here to avoid circular dependency
    # may improve the way to call the function in the future
    from src.controllers.variants_controller import get_preferred_title_for_migrated_variant

    '''
        Test a CAR variant
    '''

    with open('tests/data/migrated_variant_CA913175340.json') as json_f:
        json_s = json_f.read()
        migrated_variant = json.loads(json_s)

    preferred_title = get_preferred_title_for_migrated_variant(migrated_variant)
    assert preferred_title == 'NC_012920.1:m.15974A>G (GRCh38)'

    '''
        Test a Clinvar variant
    '''
    
    with open('tests/data/migrated_variant_139214.json') as json_f:
        json_s = json_f.read()
        migrated_variant = json.loads(json_s)
    
    preferred_title = get_preferred_title_for_migrated_variant(migrated_variant)
    assert preferred_title == 'NM_005902.4(SMAD3):c.-28C>T'
