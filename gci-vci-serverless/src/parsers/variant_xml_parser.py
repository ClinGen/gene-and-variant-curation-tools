import re

import xml.etree.ElementTree as ET

def from_xml(xml, extended=False):
  """Parses a ClinVar XML response and returns a Variant object"""
  
  variant = {}

  root = ET.fromstring(xml)
  
  # Get variant metadata. TODO: This will be moved to a more object oriented class
  # when needed.
  variant_archive_el = root.find('VariationArchive') # FIXME: should this be changed to .//Variant...?
  if variant_archive_el is not None:
    variant['clinvarVariantTitle'] = variant_archive_el.get('VariationName')
    variant['clinvarVariantId'] = variant_archive_el.get('VariationID')
  else:
    message = 'Unable to find VariantArchive element in variant XML. This element is required.'
    print({ 'info': message })
    return (None, None) if extended else None

  # We expect either an InterpretedRecord or an IncludedRecord element.
  # FIXME: If we update to python3.8 this can be written better.
  is_interpreted_record = False
  if root.find('.//InterpretedRecord') is not None:
    record_el = root.find('.//InterpretedRecord')
    is_interpreted_record = True
  elif root.find('.//IncludedRecord') is not None:
    record_el = root.find('.//IncludedRecord')
  else:
    message = 'Unable to find InterpretedRecord or IncludedRecord element in variant XML. Expected to find at least one.'
    print({ 'info': message })
    return (None, None) if extended else None

  simple_allele_el_temp = record_el.find('.//SimpleAllele')
  if simple_allele_el_temp is not None and simple_allele_el_temp.get('VariationID') == variant['clinvarVariantId']:
    simple_allele_el = simple_allele_el_temp
  else:
    haplo_type_el = record_el.find('.//Haplotype')
    if haplo_type_el is not None and haplo_type_el.get('VariationID') == variant['clinvarVariantId']:
      simple_allele_el = haplo_type_el
    elif is_interpreted_record:
      genotype_el = record_el.find('.//Genotype')
      if genotype_el is not None and genotype_el.get('VariationID') == variant['clinvarVariantId']:
        if genotype_el.find('.//SimpleAllele') is not None:
          simple_allele_el = genotype_el.find('SimpleAllele')
        elif genotype_el.find('.//Haplotype') is not None:
          simple_allele_el = genotype_el.find('.//Haplotype/SimpleAllele')

  if simple_allele_el is not None:
    variant_type_el = simple_allele_el.find('.//VariantType')
    if variant_type_el is not None:
      variant['variationType'] = variant_type_el.text

    other_name_list = []
    variant_other_name_list_el = simple_allele_el.find('.//OtherNameList')
    if variant_other_name_list_el is not None:
      for name_el in variant_other_name_list_el.findall('.//Name'):
        other_name_list.append(name_el.text)
      variant['otherNameList'] = other_name_list

    # Get the list of hgvsNames
    hgvs_list_el = simple_allele_el.findall(".//HGVSlist/HGVS") 
    hgvs_names, molecular_consequences, nucleotide_change_list, protein_change_list = __decode_hgvs_names(hgvs_list_el, extended)
    
    variant['hgvsNames'] = hgvs_names
    variant['molecularConsequenceList'] = molecular_consequences
            
    # Get the carId
    xreflist_el = simple_allele_el.find(".//XRefList/*[@DB='ClinGen']")
    if xreflist_el is not None:
      variant['carId'] = xreflist_el.get('ID')

    # Get the dbSNPIds
    xreflist_el = simple_allele_el.findall(".//XRefList/*[@DB='dbSNP']")
    db_snp_ids = []
    for xrefEl in xreflist_el:
      db_snp_ids.append(xrefEl.get('ID'))
    
    variant['dbSNPIds'] = db_snp_ids

  if extended:
    variant_extension = __from_xml_extended(
      molecular_consequences,

      # equivalent to `objTranscripts` in old code base
      nucleotide_change_list,
      protein_change_list,

      variant_archive_el, 
      simple_allele_el # TODO: or simple_allele_el_temp?
    )

    return variant, variant_extension
  else:
    return variant

# equivalent to func `parseClinvarExtended` in old code base
# but only returns the additional field, does not chnage the variant object before extending
def __from_xml_extended(molecular_consequences_list, nucleotide_change_list, protein_change_list, element_variation_archive, element_simple_allele):
  # initialize fields
  variant_extension = {
    # Group (RefSeq?) transcripts by molecular consequence, nucleotide change and protein change
    'RefSeqTranscripts': {
      'MolecularConsequenceList': [],
      'NucleotideChangeList': nucleotide_change_list,
      'ProteinChangeList': protein_change_list
    },
    'gene': {},
    'allele': {
      'SequenceLocation': [],
      'ProteinChange': None
    },
    # Save the VariationType attribute of the VariationArchive element
    'clinvarVariationType': element_variation_archive.get('VariationType')
  }

  # Used for transcript tables on "Basic Information" tab in VCI
  # HGVS property for mapping to transcripts with matching HGVS names
  # SOid and Function properties for UI display
  for molecular_consequence in molecular_consequences_list:
    variant_extension['RefSeqTranscripts']['MolecularConsequenceList'].append({
      'HGVS': molecular_consequence['hgvsName'],
      'SOid': molecular_consequence['soId'],
      'Function': molecular_consequence['term']
    })
  
  # Parse Gene element (keeping existing business logic of processing only one)
  element_gene_list = element_simple_allele.find('.//GeneList')
  if element_gene_list:
    element_gene = element_gene_list.find('.//Gene')
    if element_gene:
      variant_extension['gene'] = {
        'id': element_gene.get('GeneID'),
        'symbol': element_gene.get('Symbol'),
        'full_name': element_gene.get('FullName'),
        'hgnc_id': element_gene.get('HGNC_ID')
      }
  
  # Evaluate whether a variant has protein change
  # Keeping existing business logic of processing only one ProteinChange element
  element_protein_change = element_simple_allele.find('.//ProteinChange')

  # Set protein change property value
  if element_protein_change is not None:
    variant_extension['allele']['ProteinChange'] = element_protein_change.text
  elif len(protein_change_list) > 0:
    # attribute_change is e.g. `p.Ser126Gly` of the entire protein effect hgvs `NP_000160.1:p.Ser126Gly`
    attribute_change = protein_change_list[0]['Change']
    if attribute_change and isinstance(attribute_change, str):
      # Remove 'p.' from string value
      pos_start = attribute_change.index('.') + 1
      # new_attr_value is now `Ser126Gly`
      new_attr_value = attribute_change[pos_start:]
      # Extract the numbers into a new string
      # num is now `['126']`
      # the regex simply says, "get the last chunk of digits", i.e., get the last continuous digits
      num = re.search(r'[0-9]+(?!.*[0-9])', new_attr_value)
      if not num or not num.group(0):
        print('WARNING: ExtendedClinvarParsing: No number found in protein change expression ' + attribute_change)
        num = ''
      else:
        num = num.group(0)
        # Separate groups of letters into arrays
        # string_array is now `['Ser', 'Gly']`
        string_array = re.split(r'[0-9]+(?!.*[0-9])', new_attr_value)
        # Transform string into the format similar to common ProteinChange element value
        # so now variant.allele.ProteinChange is `Ser126G`
        suffix_abbreviation = string_array[1][0] if (len(string_array) > 1) and (string_array[1]) else ''
        variant_extension['allele']['ProteinChange'] = string_array[0] + num + suffix_abbreviation
      
      if variant_extension['allele']['ProteinChange'] == '(?)':
        # we cannot provide protein effect in this case
        variant_extension['allele']['ProteinChange'] = None

  # Parse SequenceLocation elements (attributes are used to construct LinkOut URLs)
  # Used primarily for LinkOut links on "Basic Information" tab in VCI
  # referenceAllele and alternateAllele properties are added for Population tab
  element_location = element_simple_allele.find('.//Location')

  if (element_location):
    elements_sequence_locations = element_simple_allele.findall('.//SequenceLocation')

    for elements_sequence_location in elements_sequence_locations:
      variant_extension['allele']['SequenceLocation'].append({
        'Assembly': elements_sequence_location.get('Assembly'),
        'AssemblyAccessionVersion': elements_sequence_location.get('AssemblyAccessionVersion'),
        'AssemblyStatus': elements_sequence_location.get('AssemblyStatus'),
        'Chr': elements_sequence_location.get('Chr'),
        'Accession': elements_sequence_location.get('Accession'),
        'start': elements_sequence_location.get('start'),
        'stop': elements_sequence_location.get('stop'),
        'referenceAllele': elements_sequence_location.get('referenceAllele'),
        'alternateAllele': elements_sequence_location.get('alternateAllele')
      })

  return variant_extension

def __decode_hgvs_names(hgvs_list_el, extended=False):
  if hgvs_list_el is None:
    return None

  hgvs_names = {}
  hgvs_names['others'] = []

  molecular_consequences = []

  # for extended parsing
  nucleotide_change_list = []
  protein_change_list = []

  for hgvs_el in hgvs_list_el:
    assembly_attribute = hgvs_el.get('Assembly')

    # Use the type attribute to save metadat for extended parsing.
    type_attribute = hgvs_el.get('Type') if extended else None
    
    # Nucleotide Expression
    nucleotide_el = hgvs_el.find('.//NucleotideExpression')
    nucleotide_exp_text = ''
    if nucleotide_el is not None:
      nucleotide_exp_el = nucleotide_el.find('.//Expression')

      if nucleotide_exp_el is not None:
        nucleotide_exp_text = nucleotide_exp_el.text
      
      if assembly_attribute is not None:
        hgvs_names[assembly_attribute] = nucleotide_exp_text
      elif nucleotide_exp_text not in hgvs_names['others']:
        hgvs_names['others'].append(nucleotide_exp_text)
      
      # extended parsing for nucleotide change
      if extended and type_attribute == 'coding':
        nucleotide_change_list.append({
          'HGVS': nucleotide_exp_text,
          'Change': nucleotide_el.get('change'),
          'AccessionVersion': nucleotide_el.get('sequenceAccessionVersion'),
          'Type': type_attribute,
        })

    # Protein Expression
    protein_el = hgvs_el.find('.//ProteinExpression')
    protein_exp_text = ''
    if protein_el is not None:
      protein_exp_el = protein_el.find('.//Expression')

      if protein_exp_el is not None:
        protein_exp_text = protein_exp_el.text

      if protein_exp_text not in hgvs_names['others']:
        hgvs_names['others'].append(protein_exp_text)
      
      if extended and type_attribute == 'protein':
        protein_change_list.append({
          'HGVS': protein_exp_text,
          'Change': protein_el.get('change'),
          'AccessionVersion': protein_el.get('sequenceAccessionVersion'),
          'Type': type_attribute,
        })

    # Molecular Consequence
    molecular_consequence_list_el = hgvs_el.findall('.//MolecularConsequence')
    for molecular_consequence_el in molecular_consequence_list_el:
      mcid_attr = ''
      
      if molecular_consequence_el.get('DB') == 'SO':
        mcid_attr = molecular_consequence_el.get('ID')

      molecular_consequences.append({
        'hgvsName': nucleotide_exp_text,
        'term': molecular_consequence_el.get('Type'),
        'soId': mcid_attr 
      })

  return (hgvs_names, molecular_consequences, nucleotide_change_list, protein_change_list)
  

  