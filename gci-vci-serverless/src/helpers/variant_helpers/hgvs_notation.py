import json

with open('src/helpers/data/NC_genomic_chr_format.json', 'r') as f:
  NC_GENOMIC_CHR_MAPPING = json.load(f)


def get_hgvs_notation(variant, assembly: str, omit_char_string):
  hgvs = ''
  genomic_hgvs = ''
  nc_genomic = ''
  match = ''

  try:
    if (assembly == 'GRCh37') and (variant['hgvsNames']['GRCh37']):
      genomic_hgvs = variant['hgvsNames']['GRCh37']
    elif (assembly == 'GRCh38') and (variant['hgvsNames']['GRCh38']):
      genomic_hgvs = variant['hgvsNames']['GRCh38']
  except KeyError as e:
    print(f'WARNING: cannot compute hgvs_notation from variant')
    return None

  # Extract the NC genomic substring from the HGVS name whose assembly is
  # either GRCh37 or GRCh38. By looking up the genomic-to-chromosome mappings,
  # it formats the HGVS notation either as 'chr3:g.70970756G>A' or '3:g.70970756G>A',
  # depending on whether the 'omit_char_string' optional argument is set to true.
  match = None
  if (genomic_hgvs):
    nc_genomic = genomic_hgvs[0:genomic_hgvs.index(':')]
    match = list(filter(lambda entry: entry['GenomicRefSeq'] == nc_genomic, NC_GENOMIC_CHR_MAPPING[assembly]))

  # The 'chr3:g.70970756G>A' format is for myvariant.info that uses GRCh37 assembly.
  # The '3:g.70970756G>A' format is for Ensembl VEP that uses GRCh38 assembly. Due to the
  # presence of 'chrX' and 'chrY' chromosome, substr method (i.e., [n:m]) is used instead of filtering
  # alpha letters.
  if (match):
    match = match[0]
    amino_acid_change = genomic_hgvs[genomic_hgvs.index(':'):]
    if (omit_char_string):
      chromosome = match['ChrFormat'][3:]
      hgvs = chromosome + amino_acid_change
    else:
      hgvs = match['ChrFormat'] + amino_acid_change

  # 'chr7:g.117120152_117120270del119ins299' !== 'chr7:g.117120152_117120270del'
  # ----------------------------------------------------------------------------
  # 'chr7:g.117120152_117120270del119ins299' is an 'Indel' variant, while 
  # 'chr7:g.117120152_117120270del' is a 'Deletion' variant.
  # So we should not alter the genomic GRCh38 HGVS for ensembl vep/human Rest API.
  # ----------------------------------------------------------------------------
  # Also handle 'deletion' genomic GRCh37 HGVS (compliant with myvariant.info)
  # The myvariant.info api only accepts the identifier up to the 'del' marker
  # if the 'variationType' is 'Deletion' (e.g. 'chr7:g.117188858delG').
  # However, myvariant.info would accept the entire HGVS string if
  # the 'variationType' is 'Indel' (e.g. 'chr7:g.117120152_117120270del119ins299'),
  # or 'Insertion' (e.g. 'chr7:g.117175364_117175365insT').
  # 
  if (assembly == 'GRCh37'):
    if variant['variationType'] and (variant['variationType'] == 'Deletion'):
      if hgvs and (hgvs.index('del') > 0):
        hgvs = hgvs[:hgvs.indexOf('del') + 3]

  return hgvs
      