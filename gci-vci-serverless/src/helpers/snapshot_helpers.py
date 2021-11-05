import datetime
import uuid
import os
import simplejson as json

from src.db.s3_client import Client as S3Client
from decimal import Decimal

def get_from_archive(archive_key):
  ''' Download a snapshot's curation data from S3.

  :param str archive_key: The curation data's location (S3 bucket and file path). This value is required.
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

def build(snapshot={}):
  ''' Builds and returns a valid snapshot object.

  Builds a new snapshot object by creating default values for
  required fields and combines any of the given attributes.
  '''

  # Legacy support to migrate 'rid' to 'PK'
  if 'rid' in snapshot:
    snapshot['PK'] = snapshot['rid']
    del snapshot['rid']
  else:
    snapshot['PK'] = str(uuid.uuid4())

    # Set timestamps (for new data)
    now = datetime.datetime.now().isoformat()
    snapshot['date_created'] = now
    snapshot['last_modified'] = now

  snapshot['item_type'] = 'snapshot'

  return snapshot

def archive(bucket, snapshot_pk, curation_data):
  ''' Archives a snapshot's curation data to S3.

  Uploads the curation data object as a JSON file to S3. The location of the archive
  depends on the bucket and the primary key of the curation data. If the upload fails,
  an exception is raised. If successful, returns the archive location.

  :param str bucket: The name of the S3 bucket for the archive. This value is required.
  :param str snapshot_pk: The snapshot PK to use as the name of the JSON file. This value is required.
  :param obj curation_data: The curation data object to archive. This value is required.
  '''

  if bucket is None or len(bucket) <= 0:
    raise ValueError()

  if snapshot_pk is None or len(snapshot_pk) <= 0:
    raise ValueError()

  if not curation_data:
    raise ValueError()

  archive_file = __archive_key(curation_data) + '/' + snapshot_pk + '.json'

  # Upload curation data to S3 archive bucket.
  s3_client = S3Client()

  try:
    s3_client.put_object(
      bytes(json.dumps(curation_data).encode('UTF-8')),
      bucket,
      archive_file
    )
  except Exception as e:
    print('ERROR: Error uploading ' + archive_file + ' to ' + bucket + ' bucket. ERROR\n%s' %e)
    raise

  archive_key_comps = [bucket, archive_file]

  return '/'.join(archive_key_comps)

def __archive_key(curation_data):
  return curation_data['PK']

