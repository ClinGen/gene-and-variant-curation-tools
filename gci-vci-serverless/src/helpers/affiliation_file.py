import simplejson as json
import os
from decimal import Decimal

local_file_dir = os.environ.get('LOCAL_FILE_DIR', '')
affiliation_data = []
saved_affiliation = []

# Load affiliation data from a JSON file maintained for the UI
def load_affiliation_data():
  global affiliation_data

  if not affiliation_data:
    try:
      # print ('local_file_dir = %s ' %local_file_dir )
      affiliation_data = json.load(open(local_file_dir + '/affiliations.json'))

    except Exception:
      pass

# Lookup affiliation data associated with a provided ID
def lookup_affiliation_data(affiliation_id, affiliation_key, affiliation_subgroup=None):
  global affiliation_data
  global saved_affiliation

  # print ('affiliation_id = %s ' %affiliation_id )
  # print ('affiliation_key = %s ' %affiliation_key )
  # print ('affiliation_subgroup = %s ' %affiliation_subgroup )
  if affiliation_id and affiliation_key:
    if not saved_affiliation or 'affiliation_id' not in saved_affiliation or affiliation_id != saved_affiliation['affiliation_id']:
      load_affiliation_data()

      for affiliation in affiliation_data:
        try:
          if affiliation_id == affiliation['affiliation_id']:
            saved_affiliation = affiliation
            break

        except Exception:
          pass

    try:
      if affiliation_subgroup:
        # temp = json.dumps(saved_affiliation, separators=(',', ':'))
        # print ('saved_affiliation = %s ' %temp)

        return saved_affiliation['subgroups'][affiliation_subgroup][affiliation_key]
      else:
        return saved_affiliation[affiliation_key]

    except Exception:
      pass

    return None
  else:
    return None

