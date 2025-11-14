import json
import requests

def get_litvar(rs_id):
  url = 'https://www.ncbi.nlm.nih.gov/research/litvar2-api/sensor/rs' + rs_id
  response = requests.get(url)
  if response.ok:
    data = json.loads(response.content)
    return data
  else:
    return None