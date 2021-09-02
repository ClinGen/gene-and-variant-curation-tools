import os
import requests
import json
import traceback

import src.parsers.variant_xml_parser as v_xml_parser
from src.helpers.variant_helpers.primary_transcript import get_primary_transcript
from src.helpers.variant_helpers.hgvs_notation import get_hgvs_notation

 
def find(hgvs_notation: str, grouping=True):
    """Queries the Ensembl VEP API for effects caused by a Variant given the hgvs notation of a variant

    This function queries the Ensemvl VEP API for a Varaint with the given hgvs notation. If found,
    it decodes the response into a dictionary containing all the effects and returns it.

    :param dict clinvar_xml: the XML response from clinvar, it'll be parsed into clinvar variant and used for finding `primaryTranscripts`.
        If not provided, will return `primaryTranscripts` as empty [].
    """

    res = requests.get(
        os.environ['ENSEMBL_VEP_HGVS_ENDPOINT'] + hgvs_notation,
        params={
            'content-type': 'application/json',
            'hgvs': '1',
            'protein': '1',
            'xref_refseq': '1',
            'ExAC': '1',
            # 'MaxEntScan': '1',
            'GeneSplicer': '1',
            'Conservation': '1',
            'numbers': '1',
            'domains': '1',
            'mane': '1',
            'canonical': '1',
            'merged': '1',
        }
    )

    if res.ok:
        response_data = res.json()

        if isinstance(response_data, list) and len(response_data) > 0:
            response_data = response_data[0]
        
        # replace by only effective transcripts
        effective_vep_transcripts = get_effective_overlap_transcripts_from_ensembl_vep(response_data.get('transcript_consequences', []))

        # get all transcripts that are MANE
        mane_transcript_genomic_coordinate_set = set()
        for transcript in effective_vep_transcripts:
            if 'mane' in transcript and transcript['mane']:
                mane_transcript_genomic_coordinate_set.add(transcript['mane'])
        
        # patch transcripts which are MANE but lacking `.mane` property
        for transcript in effective_vep_transcripts:
            tokens = transcript['hgvsc'].split(':')
            if len(tokens) == 0:
                raise EnsemblVEPClientError(f'transcript from ensembl has malformed hgvsc {transcript["hgvsc"]}', 500)
                
            genomic_coordinate = tokens[0]
            if genomic_coordinate and genomic_coordinate in mane_transcript_genomic_coordinate_set:
                transcript['mane'] = genomic_coordinate

        if not grouping:
            return effective_vep_transcripts
        
        # construct grouped ensembl vep response
        ensembl_vep_response = {}
        ensembl_vep_response['refSeqTranscripts'] = get_refseq_transcripts_from_ensembl_vep(effective_vep_transcripts)
        ensembl_vep_response['ensemblTranscripts'] = list(filter(lambda t: 'source' in t and (t['source'] == 'Ensembl'), effective_vep_transcripts))

        return ensembl_vep_response
    
    error_detail = ''
    try:
        error_response_payload = res.json()
        error_detail = error_response_payload['error']
    except:
        pass
    
    raise EnsemblVEPClientError(error_detail, res.status_code)

def get_refseq_transcripts_from_ensembl_vep(ensembl_vep_transcripts):
    effective_overlap_transcripts = get_effective_overlap_transcripts_from_ensembl_vep(ensembl_vep_transcripts)
    return list(filter(lambda t: 'source' in t and (t['source'] == 'RefSeq'), effective_overlap_transcripts))

def get_effective_overlap_transcripts_from_ensembl_vep(ensembl_vep_transcripts):
    """Filter by hgvsc. If a transcipt has no hgvsc, it means it does not overlap with 
    our queried nucleotide change (hgvs_notation) thus not of our interest
    """
    return list(filter(lambda t: 'hgvsc' in t and (isinstance(t['hgvsc'], str)), ensembl_vep_transcripts))

def get_effective_vep_transcripts_by_variant(variant, raise_external_api_exception=True):
    '''This method attempts to request Ensembl VEP API and get transcripts for the variant.

    :return: a list of transcripts from Ensembl VEP API, or if Ensembl API failed, return an empty list, or if not able to initialize a Ensembl API request, return None. i.e., a list is returned if Ensembl API request attempted; otherwise `None` if no Ensembl API request made.
    :rtype: list|None
    '''

    effective_vep_transcripts = None
    hgvs_notation = get_hgvs_notation(variant, 'GRCh38', True)
    if hgvs_notation:
        try:
            effective_vep_transcripts = find(hgvs_notation, grouping=False)
        except EnsemblVEPClientError as e:
            message = f'From Ensembl VEP API: {e.message} {e.status_code}\nThe hgvs_notation is {hgvs_notation}\nThe variant is {variant}'
            if raise_external_api_exception:
                raise EnsemblVEPClientError(message, e.status_code)
            else:
                print(f'WARNING: {message}')
                return []
    else:
        message = f'cannot request Ensembl VEP API because unable to compute hgvs_notation for variant. hgvs_notation={hgvs_notation}\nThe variant is {variant}'
        if raise_external_api_exception:
            raise EnsemblVEPClientError(f'EnsemblVEPClientError: {message}', 500)
        else:
            print(f'WARNING: in EnsemblVEPClient: {message}')
    
    return effective_vep_transcripts

def get_clinvar_primary_transcript(variant_effects, clinvar_xml):
  if clinvar_xml:
      variant, variant_extension = v_xml_parser.from_xml(clinvar_xml, True)
      try:
          clinvar_primary_transcript = get_primary_transcript(variant, variant_extension, variant_effects['refSeqTranscripts'])
      except Exception as primary_transcript_exception:
          raise EnsemblVEPClientError(f'Error while getting clinvar primary transcript: {"".join(traceback.TracebackException.from_exception(primary_transcript_exception).format())}', 500)
      variant_effects['primaryTranscripts'] = [clinvar_primary_transcript] if clinvar_primary_transcript else []
      return variant_effects
  else:
      return variant_effects

class EnsemblVEPClientError(Exception):
    # default values
    message = 'There was an unexpected error from the Ensembl VEP HGVS service.'
    status_code = 400

    def __init__(self, message, status_code):
        if message:
            self.message = message

        if status_code:
            self.status_code = status_code
    