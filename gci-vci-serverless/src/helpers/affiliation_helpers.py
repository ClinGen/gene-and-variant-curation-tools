import simplejson as json
import os
from decimal import Decimal

local_file_dir = os.environ.get('LOCAL_FILE_DIR', '')

# Load affiliation data from a JSON file maintained for the UI
def load_affiliation_file():
  affiliation_data = []

  try:
    # print ('local_file_dir = %s ' %local_file_dir )
    return json.load(open(local_file_dir + '/affiliations.json'))

  except Exception:
      pass

