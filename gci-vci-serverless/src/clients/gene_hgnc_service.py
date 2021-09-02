import requests
import xml.etree.ElementTree as ET

genePropertyMap = {
  'symbol': 'symbol',
  'hgnc_id': 'hgncId',
  'entrez_id': 'entrezId',
  'name': 'name',
  'status': 'hgncStatus',
  'alias_symbol': 'synonyms',
  'alias_name': 'nameSynonyms',
  'prev_symbol': 'previousSymbols',
  'prev_name': 'previousNames',
  'location': 'chromosome',
  'locus_type': 'locusType',
  'omim_id': 'omimIds',
  'pubmed_id': 'pmids'
}

def fetch_hgnc(gene_symbol):
  fetch_url = 'https://rest.genenames.org/fetch/symbol/'
  
  try:
    res = requests.get(fetch_url + gene_symbol, timeout=60)
  except Exception as e:
    raise
  else:
    hgnc_xml = str(res.text)
    root = ET.fromstring(hgnc_xml)
    # Find the <result> element
    response_el = root.find('result')
    if response_el is not None:
      # If a result is returned
      if int(response_el.get('numFound')) > 0:
        # Find the <doc> element
        doc_el = response_el.find('doc')
        if doc_el is not None:
          gene = {}
          # Loop through the elements and get the necessary information
          for child in doc_el:
            el_name = child.get('name')
            if el_name in list(genePropertyMap):
              # If pubmed_id, convert pmid from number to string 
              if el_name == 'pubmed_id':
                gene[genePropertyMap[el_name]] = [str(pmid.text) for pmid in child]
              elif el_name == 'alias_symbol' or el_name == 'alias_name' or el_name == 'prev_symbol' or el_name == 'prev_name' or el_name == 'omim_id':
                # These elements are in array so copy over 
                gene[genePropertyMap[el_name]] = [item.text for item in child]
              else:
                # Others are just string
                gene[genePropertyMap[el_name]] = child.text
          return gene
        else:
          print('ERROR: Empty doc element in HGNC response')
          return None
      else:
        print('ERROR: Gene not found at HGNC')
        return None
    else:
      print("ERROR: Empty result element in HGNC response")
      return None

def filter_gene_for_HGNC_compare(gene_object):
  gene = {}
  for key in genePropertyMap:
    if genePropertyMap[key] in gene_object: 
      if len(gene_object[genePropertyMap[key]]) > 0:
        gene[genePropertyMap[key]] = gene_object[genePropertyMap[key]]

  return gene

class Error(Exception):
  pass

class ClientError(Error):

  def __init__(self, message, status_code):
    self.message = message
    self.status_code = status_code

