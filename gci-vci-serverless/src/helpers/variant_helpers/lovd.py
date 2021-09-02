import json
import requests

def get_lovd(gene_name, variant_on_genome):
  url =  'https://databases.lovd.nl/shared/api/rest.php/variants/' + gene_name + '?search_position=' + variant_on_genome + '&format=application/json'
  res = requests.get(url)
  if res.ok:
    lovd_url = 'https://databases.lovd.nl/shared/variants/in_gene?search_geneid=' + gene_name + '&search_VariantOnGenome/DNA=' + variant_on_genome
    return { 'shared': lovd_url }
  else:
    url =  'https://databases.lovd.nl/whole_genome/api/rest.php/variants/' + gene_name + '?search_position=' + variant_on_genome + '&format=application/json'
    res = requests.get(url)
    if res.ok:
      lovd_url = 'https://databases.lovd.nl/whole_genome/variants/in_gene?search_geneid=' + gene_name + '&search_VariantOnGenome/DNA=' + variant_on_genome
      return { 'whole_genome': lovd_url }
    else:
      return None