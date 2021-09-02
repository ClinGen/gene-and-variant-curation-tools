from .preferred_title_helper \
import get_preferred_title_from_ensembl_vep_transcript


def get_canonical_transcript_title(ensembl_vep_transcripts):
  """This method generates the canonical title, which can be used as a candidate for variant preferred title.
  """

  # select an "iconic" canonical transcript that can represent the variant
  selected_canonical_transcript_from_ensembl = get_representative_canonical_transcript(ensembl_vep_transcripts)
  if not selected_canonical_transcript_from_ensembl:
    return None
  
  if not (
    'hgvsc' in selected_canonical_transcript_from_ensembl and 
    isinstance(selected_canonical_transcript_from_ensembl['hgvsc'], str) and
    selected_canonical_transcript_from_ensembl['hgvsc']
  ):
    return None

  hgvsc = selected_canonical_transcript_from_ensembl['hgvsc']
  hgvsc_tokens = hgvsc.split(':')
  if len(hgvsc_tokens) == 0:
    return None
  
  canonical_transcript_id = hgvsc_tokens[0]

  return get_preferred_title_from_ensembl_vep_transcript(canonical_transcript_id, selected_canonical_transcript_from_ensembl)


def get_representative_canonical_transcript(ensembl_vep_transcripts: list) -> dict:
  """Method to return the canonical transcript given the Ensembl transcripts.
  Note that there are possibly multiple canonical transcript(s) in Ensembl
  transcripts, this method only picks the representative one, since this method
  is intended to be used for getting a single canonical transcript title for a variant.
  
  Among the canonical transcripts, whether or not one qualifies as the representative 
  canonical transcript, is determined by algorithm below:
  
  1. [**General Singularity Test**] - If only one canonical transcript exists in Ensembl transcripts, return it
  2. [**NM Singularity Test**] - If there're multiple canonical transcripts, and only one of them whose 
       c. nomenclature (i.e. `hgvsc`) starts with NM, return it
  3. [**NM Singularity Test**] - If there're multiple canonical transcripts whose `hgvsc` starts with NM, 
       return null, which also means we don't use canonical transcripts for variant title
  4. [**NR Singularity Test**] - If there're no canonical transcript with `NM` prefix, look for canonical transcripts 
       with `NR` prefix; if there's exactly one with `NR` prefix, return it
  5. Otherwise return null; this includes cases of multiple caonical transcripts with NR prefix
  
  
  ### Examples:
  
  e.g. 1: `NR_1, XR_1, XR_2, XM_1, XM_2 ...`: in this case there is no NM but there is one NR_1 so use that
  
  e.g. 2: `NR_1, NR_2, XR_1, XR_2, XM_1, XM_2 ...`: in this case skip because there is no NM and there is more than one NR
  
  e.g. 3: `NM_1, NR_1, NR_2, XR_1, XR_2, XM_1, XM_2 ...`: in this case use NM_1
  
  e.g. 4: `NM_1, NM_2_ NR_1, XR_1, XR_2, XM_1, XM_2 ...`: in this case skip because there is more than one NM
  
  @see {@link https://github.com/ClinGen/clincoded/issues/2176|Issue 2176}
  @see getCanonicalTranscriptTitleFromEnsemblTranscripts
  """

  # Filter all ensembl transcripts marked as canonical
  canonical_transcripts = list(filter(lambda t: (
    'hgvsc' in t and isinstance(t['hgvsc'], str) and
    'canonical' in t and t['canonical'] and
    'hgvsp' in t and t['hgvsp']
  ), ensembl_vep_transcripts))

  # No canonical transcript found in ensemb transcripts
  if len(canonical_transcripts) == 0:
    return None
  
  # General Singularity Test
  if len(canonical_transcripts) == 1:
    return canonical_transcripts[0]

  # NM Singularity Test
  canonical_transcripts_start_by_NM = list(filter(lambda t: (
    'hgvsc' in t and isinstance(t['hgvsc'], str) and t['hgvsc'] and
    t['hgvsc'].strip().startswith('NM')
  ), canonical_transcripts))
  if len(canonical_transcripts_start_by_NM) == 1:
    return canonical_transcripts_start_by_NM[0]
  elif len(canonical_transcripts_start_by_NM) > 1:
    return None
  
  # NR Singularity Test
  canonical_transcripts_start_by_NR = list(filter(lambda t: (
    'hgvsc' in t and isinstance(t['hgvsc'], str) and t['hgvsc'] and
    t['hgvsc'].strip().startswith('NR')
  ), canonical_transcripts))
  if len(canonical_transcripts_start_by_NR) == 1:
    return canonical_transcripts_start_by_NR[0]
  
  # Did not find qualifying canonical transcript title
  return None
