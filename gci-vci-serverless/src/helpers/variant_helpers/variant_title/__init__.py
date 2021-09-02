from src.helpers.variant_helpers.variant_title.canonical_transcript_title import get_canonical_transcript_title
from src.helpers.variant_helpers.variant_title.MANE_transcript_title import get_MANE_transcript_title


def preferred_title_for(variant, effective_ensembl_vep_transcripts: list, gene_source_from_clinvar_variant_extension=None, car_data=None):
  """Determines the preferredTitle value for a given Variant

  The preferredTitle field is calculated field based on a few criteria. The general
  logic for determining the preferred title is:

  1. Check MANE Transcript and if it exists, use its info as preferred title to represent the variant
  2. Check ClinVar Title
  3. Check Canonical Transcripts and if a qualified one exists, use its info as preferred title to represent the variant
  4a. Check GRCh38 NC_ HGVS Name
  4b. Check GRCh37 NC_ HGVS Name
  5. Check `otherDescription`

  :param dict variant: the variant object obtained fro clinvar or CAR client
  :param list effective_ensembl_vep_transcripts: ensemble transcript list from ensembl vep API response
  :param dict|None gene_source_from_clinvar_variant_extension: provide gene source by using clinvar's variant extension object
  :param dict|None car_data: the CAR's API variant response object. Used for providing gene source, as well as nucleotide and protein change

  """

  fallback_title = 'A preferred title is not available'

  # lookup gene and amount; 
  # if gene not exacly one, or ensembl transcript not avaiable, 
  # don't even bother computing MANE and Canonical title,
  # just consider clinvar title, GRch37/38 or other options
  gene_list = []
  if gene_source_from_clinvar_variant_extension:
    gene_list = [gene_source_from_clinvar_variant_extension['gene']['symbol']] if 'symbol' in gene_source_from_clinvar_variant_extension['gene'] else []
  elif car_data:
    if 'transcriptAlleles' in car_data:
      gene_list = list(filter(lambda transcript_allele: 'geneSymbol' in transcript_allele, car_data['transcriptAlleles']))
      gene_list = list(map(lambda transcript_allele: transcript_allele['geneSymbol'], gene_list))
      gene_list = list(set(gene_list))
  # pull out gene - MANE needs it to generate preferred title
  # ensembl transcript also has gene info though, but we're using gene info from variant, which could make sure it's the correct transcript with the right gene to locate
  gene_symbol = gene_list[0] if len(gene_list) == 1 else None

  # determine criteria to use
  if len(gene_list) != 1 or not effective_ensembl_vep_transcripts:
    # MANE and Canonical title computing is skipped because gene list is not exactly one and ambiguious
    criteria = ['clinvar', 'GRCh', 'other']
  else:
    criteria = ['mane', 'clinvar', 'canonical', 'GRCh', 'other']

  for criterion in criteria:
    if criterion == 'mane':
      # try MANE trancript title first
      # MANE requires gene symbol to be exactly one
      if not gene_symbol:
        continue
      preferred_title = get_MANE_transcript_title(effective_ensembl_vep_transcripts, gene_symbol, car_data=car_data)
      if preferred_title:
        return preferred_title
    
    elif criterion == 'clinvar':
      # try clinvar title
      preferred_title = get_clinvar_title(variant)
      if preferred_title:
        return preferred_title
    
    elif criterion == 'canonical':
      # try canonical title
      # Canonical requires gene symbol to be exactly one
      if not gene_symbol:
        continue
      preferred_title = get_canonical_transcript_title(effective_ensembl_vep_transcripts)
      if preferred_title:
        return preferred_title
    
    elif criterion == 'GRCh':
      # try the basic hgvs
      preferred_title = get_hgvs_title(variant)
      if preferred_title:
        return preferred_title
    
    elif criterion == 'other':
      # as a last resort, try other description
      # based on JIRA ticket https://asjira.stanford.edu/jira/browse/CLINAWS-394
      preferred_title = variant.get('otherDescription')
      if preferred_title:
        return preferred_title

  # no criterion succeed above, there's likely an error in variant data
  # but we'll return a catch-all case here
  print(f'WARNING: tried all criteria ({criteria}) but was not able to compute a preferred title for this variant. Will assign a placeholder title. gene_list={gene_list}, variant={variant}')
  return fallback_title  


def get_clinvar_title(variant):
  if 'clinvarVariantTitle' in variant and variant['clinvarVariantTitle']:
    return variant['clinvarVariantTitle']


def get_hgvs_title(variant):
  if 'hgvsNames' in variant and isinstance(variant['hgvsNames'], dict):
    if 'GRCh38' in variant['hgvsNames']:
      return variant['hgvsNames']['GRCh38'] + ' (GRCh38)'
    elif 'GRCh37' in variant['hgvsNames']:
      return variant['hgvsNames']['GRCh37'] + ' (GRCh37)'
