import json


with open('src/helpers/data/SO_term.json', 'r') as f:
  SO_TERMS = json.load(f)


def __get_SO_id_term(nucleotide_hgvs: str, molecular_consequences_list: list):
  for molecular_consequence in molecular_consequences_list:
    if not molecular_consequence['HGVS'] == nucleotide_hgvs:
      continue

    # 'SO_terms' is defined via requiring external mapping file
    for so_term in SO_TERMS:
      if (so_term['SO_id'] != molecular_consequence['SOid']):
        continue

      return so_term['SO_term'] + ' ' + so_term['SO_id']
  
  return None

# Create ClinVar primary transcript object from "parse clinvar extended" method
# as well as from the primary RefSeq transcript from Ensembl VEP response
# migrated from old code base `getPrimaryTranscript()`
def get_primary_transcript(variant: dict, clinvar_variant_extension: dict, refseq_transcripts_from_ensembl_vep: list):
  primary_transcript = {
    'nucleotide': None,
    'hgvsc': None,

    'exon': '--',

    'protein': '--',
    'hgvsp': '--',

    'molecular': '--',
    'consequence_terms': '--'
  }

  clinvar_variant_title = variant['clinvarVariantTitle']
  nucleotide_change_list = clinvar_variant_extension['RefSeqTranscripts']['NucleotideChangeList']
  molecular_consequences_list = clinvar_variant_extension['RefSeqTranscripts']['MolecularConsequenceList']

  result = list(filter(lambda n: n['AccessionVersion'] in clinvar_variant_title, nucleotide_change_list))
  if result:
    result = result[0]
    primary_transcript['nucleotide'] = result['HGVS']
  
  if primary_transcript['nucleotide'] and molecular_consequences_list:
    primary_transcript['molecular'] = __get_SO_id_term(primary_transcript['nucleotide'], molecular_consequences_list)
  
  # Find RefSeq transcript (from VEP) whose nucleotide HGVS matches ClinVar's
  # and map the Exon and Protein HGVS of the found RefSeq transcript to ClinVar
  # Filter RefSeq transcripts by 'source' and 'hgvsc' flags
  for refseq_transcript in refseq_transcripts_from_ensembl_vep:
    if (refseq_transcript['hgvsc'] == primary_transcript['nucleotide']):
      primary_transcript['exon'] = refseq_transcript['exon'] if 'exon' in refseq_transcript else '--'
      primary_transcript['protein'] = refseq_transcript['hgvsp'] if 'hgvsp' in refseq_transcript else '--'
      break
  
  # populate field columns in basic info tab
  primary_transcript['hgvsc'] = primary_transcript['nucleotide']
  primary_transcript['hgvsp'] = primary_transcript['protein']
  primary_transcript['consequence_terms'] = primary_transcript['molecular']
  
  return primary_transcript
