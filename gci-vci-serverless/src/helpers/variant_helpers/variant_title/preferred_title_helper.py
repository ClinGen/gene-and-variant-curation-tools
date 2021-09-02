def get_preferred_title(transcript_id, nucleotide_change, gene_name='', amino_acid_change=''):
  """Method to return the variant preferred title. Examples given as below.
  
  `NM_015506.3(MMACHC):c.436_450del (p.Ser146_Ile150del)`

  NM: Chromosome

  015506: Gene on chromosome (a gene produces certain protein)

  MMACHC: Symbol represent the gene

  c.436_450del: Nucleotide change

  p.Ser146_Ile150del: Name of the amino acid (protein) change

  ### Other Examples
    
  Regarding the title format, below gives another example:

  When both gene name and protein effect information are available, the format will be `NM_002496.4(Gene):c.64C>T (Amino-acid change)`.

  When protein effect is unavailable, the format will be `NM_002496.4(Gene):c.64C>T`.

  When both gene and protein effect not available, will fall back to hgvs format `NM_002496.4:c.64C>T`.

  When gene name is unavailable, amino-acid change is unavailable as well, so the format will fallback to hgvs as above.


  """

  if not (transcript_id and nucleotide_change):
    return

  if not gene_name:
    return '{coordinate}:{nucleotide_change}'.format(coordinate=transcript_id, nucleotide_change=nucleotide_change)
  
  # when gene name is unavailable, then there will be no amino-acid change, where title will fall back to hgvs form, i.e. transcriptId:nucleotideChange
  if not amino_acid_change:
    return '{coordinate}({gene_symbol}):{nucleotide_change}'.format(
      coordinate=transcript_id, 
      nucleotide_change=nucleotide_change,
      gene_symbol=gene_name
    )
  
  return '{coordinate}({gene_symbol}):{nucleotide_change} ({amino_acid_change})'.format(
    coordinate=transcript_id, 
    nucleotide_change=nucleotide_change,
    gene_symbol=gene_name,
    amino_acid_change=amino_acid_change
  )


def get_preferred_title_from_ensembl_vep_transcript(transcript_id, ensembl_vep_transcript, gene_symbol: str = None, car_data: dict = None):
  """This method returns the preferred variant title using a transcript from Ensembl API, and optionally CAR data.
    CAR data is preferred over Ensembl, since it has better protein information.
  """

  # below are what needed to get a formatted preferred title
  # the more we have the better, but only nucleotide_change is mandatory
  nucleotide_change = None
  amino_acid_change = None

  # use CAR data if available
  if car_data:
    transcriptAlleles = car_data.get('transcriptAlleles', [])
    for transcript_from_car in transcriptAlleles:
      # try to find a matching CAR transcript by comparing to `transcript_id`

      hgvs_list = transcript_from_car.get('hgvs')
      if hgvs_list and isinstance(hgvs_list[0], str):
        hgvs = hgvs_list[0]
        tokens_from_hgvs = hgvs.split(':')
        # require at least two tokens, one for transcriptId, another for nucleotideChange
        if len(tokens_from_hgvs) < 2:
          continue

        car_transcript_id = tokens_from_hgvs[0]

        # found matching transcript in CAR; acquire nucleotide and amino acid change from the transcript
        if car_transcript_id == transcript_id:
          if not nucleotide_change:
            nucleotide_change = tokens_from_hgvs[1]
          
          if not gene_symbol:
            gene_symbol = transcript_from_car.get('geneSymbol')

          # try to get amino acid change
          protein_hgvs = transcript_from_car.get('proteinEffect', {}).get('hgvs')
          if protein_hgvs and isinstance(protein_hgvs, str):
            token_from_protein_hgvs = protein_hgvs.split(':')
            # require at least two tokens, the amino acid change we want is the substring after `:`
            if len(token_from_protein_hgvs) < 2:
              # may try to find other matching CAR transcript, if any, to acquire amino acid change
              continue
            
            amino_acid_change = token_from_protein_hgvs[1]
            break
  
  # use the transcript from Ensembl VEP

  if not gene_symbol:
    gene_symbol = ensembl_vep_transcript.get('gene_symbol')
  
  if not nucleotide_change:
    hgvsc = ensembl_vep_transcript.get('hgvsc')
    if hgvsc and isinstance(hgvsc, str):
      hgvsc_tokens = hgvsc.split(':')
      nucleotide_change = hgvsc_tokens[1] if len(hgvsc_tokens) > 1 else ''

  if not amino_acid_change:
    hgvsp = ensembl_vep_transcript.get('hgvsp')
    if hgvsp:
      hgvsp_tokens = hgvsp.split(':')
      amino_acid_change = hgvsp_tokens[1] if len(hgvsp_tokens) > 1 else ''

  # at least need `nucleotide_change` to generate any preferred title
  if not nucleotide_change:
    return

  return get_preferred_title(
    transcript_id,
    nucleotide_change,
    gene_name=gene_symbol,
    amino_acid_change=amino_acid_change
  )
