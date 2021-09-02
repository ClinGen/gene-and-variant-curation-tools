
from .preferred_title_helper import \
get_preferred_title, get_preferred_title_from_ensembl_vep_transcript


def get_MANE_transcript_title(ensembl_vep_transcripts, gene_symbol: str, car_data: dict = None):
  MANE_transcript_candidate = list(filter(lambda t: (
    ('mane' in t and t['mane']) and 
    ('gene_symbol' in t and t['gene_symbol'] == gene_symbol)
    # note that we don't filter by `hgvsp` because it may be unavailable for some MANE selected transcript; sources like CAR or Clinvar is better, more stable to get protein effect
  ), ensembl_vep_transcripts))

  if len(MANE_transcript_candidate) == 0:
    return

  # normally should only have one MANE transcript, but since we're patching all equivalent transcript as MANE
  # there might be multiple marked as MANE, but they are identical and we can safely just use the first one
  MANE_transcript_candidate = MANE_transcript_candidate[0]

  return get_preferred_title_from_ensembl_vep_transcript(MANE_transcript_candidate['mane'], MANE_transcript_candidate, gene_symbol=gene_symbol, car_data=car_data)
