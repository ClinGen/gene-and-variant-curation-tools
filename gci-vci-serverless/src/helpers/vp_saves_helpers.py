import datetime
import uuid

import simplejson as json

from src.db.s3_client import Client as S3Client
from decimal import Decimal

def get_from_archive(archive_key):
  ''' Download a VP Save from S3.

  :param str archive_key: The vp_save data's location (S3 bucket and file path). This value is required.
  '''

  if archive_key is None or '/' not in archive_key:
    raise ValueError()

  bucket, key = archive_key.split('/', 1)

  s3_client = S3Client()

  try:
    archive_object = json.loads(s3_client.get_object(bucket, key)['Body'].read(),parse_float=Decimal)
  except Exception as e:
    print('ERROR: Error downloading ' + key + ' from ' + bucket + ' bucket. ERROR\n%s' %e)
    raise

  return archive_object

def build(vp_save={}):
  ''' Builds and returns a valid vp_save object.

  Builds a new vp_save object by creating default values for
  required fields and combines any of the given attributes.
  '''


  vp_save['PK'] = str(uuid.uuid4())

  # Set timestamps (for new data)
  now = datetime.datetime.now().isoformat()
  vp_save['date_created'] = now
  vp_save['last_modified'] = now

  vp_save['item_type'] = 'vp_save'

  return vp_save

def archive(bucket, vp_save_pk, save_data):
  ''' Archives a vp save data to S3.

  Uploads the save data object as a JSON file to S3. The location of the archive
  depends on the bucket and the primary key of the save data. If the upload fails,
  an exception is raised. If successful, returns the archive location.

  :param str bucket: The name of the S3 bucket for the archive. This value is required.
  :param str vp_save_pk: The vp_save PK to use as the name of the JSON file. This value is required.
  :param obj save_data: The save data object to archive. This value is required.
  '''

  if bucket is None or len(bucket) <= 0:
    raise ValueError()

  if vp_save_pk is None or len(vp_save_pk) <= 0:
    raise ValueError()

  if not save_data:
    raise ValueError()
  
  archive_file = __archive_key(save_data) + '/' + vp_save_pk + '.json'

  # Upload curation data to S3 archive bucket.
  s3_client = S3Client()

  try:
    s3_client.put_object(
      bytes(json.dumps(save_data).encode('UTF-8')),
      bucket,
      archive_file
    )
  except Exception as e:
    print('ERROR: Error uploading ' + archive_file + ' to ' + bucket + ' bucket. ERROR\n%s' %e)
    raise
  
  archive_key_comps = [bucket, archive_file]
  
  return '/'.join(archive_key_comps)

def __archive_key(save_data):
  return save_data['PK']
