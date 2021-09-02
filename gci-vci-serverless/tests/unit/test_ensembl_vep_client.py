import json
import pytest

import src.clients.ensembl_vep_client as test_ensembl_vep_client

# curl -H "Content-Type:application/json"  http://localhost:3000/variants/\?basicInfo\=1:g.45508802_45508816del


def load_variant_json(hgvs_notation):
  f_name = 'tests/data/ensembl_vep_hgvs_' + hgvs_notation + '.json'
  with open(f_name) as json_f:
    json_s = json_f.read()

  # the api returns a list of result
  # usually we only care about the first one, also it mostly returns either zero or one result
  ensembl_vep_response = json.loads(json_s)

  return ensembl_vep_response[0] if len(ensembl_vep_response) > 0 else None
