def preferred_title_for(variant):
  """Determines the preferredTitle value for a given Variant

  The preferredTitle field is calculated field based on a few criteria. The general
  logic for determining the preferred title is:

  1. Use communitystandardtitle from allele registry
  2. Use the ClinVar variant title
  3. Use the genomic coordinates
     a. Check GRCh38 NC_ HGVS Name
     b. Check GRCh37 NC_ HGVS Name


  :param dict variant: the variant object obtained fro clinvar or CAR client

  """

  fallback_title = 'A preferred title is not available'

  criteria = ['car', 'clinvar', 'GRCh']

  for criterion in criteria:
    if criterion == 'car':
      # try allele registry "communityStandardTitle"
      preferred_title = get_car_communityStandardTitle(variant)
      if preferred_title:
        return preferred_title
    
    elif criterion == 'clinvar':
      # try clinvar title
      preferred_title = get_clinvar_title(variant)
      if preferred_title:
        return preferred_title
    
    elif criterion == 'GRCh':
      # try the basic hgvs
      preferred_title = get_hgvs_title(variant)
      if preferred_title:
        return preferred_title
    
  # no criterion succeed above, there's likely an error in variant data
  # but we'll return a catch-all case here
  print(f'WARNING: tried all criteria ({criteria}) but was not able to compute a preferred title for this variant. Will assign a placeholder title. gene_list={gene_list}, variant={variant}')
  return fallback_title  


def get_car_communityStandardTitle(variant):
  if variant and 'communityStandardTitle' in variant and variant['communityStandardTitle']:
    return variant['communityStandardTitle']


def get_clinvar_title(variant):
  if 'clinvarVariantTitle' in variant and variant['clinvarVariantTitle']:
    return variant['clinvarVariantTitle']


def get_hgvs_title(variant):
  if 'hgvsNames' in variant and isinstance(variant['hgvsNames'], dict):
    if 'GRCh38' in variant['hgvsNames']:
      return variant['hgvsNames']['GRCh38'] + ' (GRCh38)'
    elif 'GRCh37' in variant['hgvsNames']:
      return variant['hgvsNames']['GRCh37'] + ' (GRCh37)'
