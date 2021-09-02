import os
import boto3
import botocore
import simplejson as json

from botocore.exceptions import ClientError
from botocore.exceptions import BotoCoreError
from decimal import Decimal

class Client:
  def __init__(self):
    s3_client_options = {}

    # if running serverless offline (local), set up local s3
    if os.environ.get('IS_OFFLINE', 'false') == 'true':
      s3_client_options ={
        'aws_access_key_id': 'S3RVER',
        'aws_secret_access_key': 'S3RVER',
        'endpoint_url': 'http://localhost:4569'
      }
    
    self.s3_client = boto3.client('s3', **s3_client_options)
  
  def put_object(self, obj, bucket, key):
    try:
      self.s3_client.put_object(
        Body=obj,
        Bucket=bucket,
        Key=key
      )
    except ClientError as ce:
      print('ERROR: S3 put object error: %s' %ce)
      raise
    except BotoCoreError as be:
      print('ERROR: BotoCore error: %s' %be)
      raise

  def get_object(self, bucket, key):
    try:
      s3_object = self.s3_client.get_object(
        Bucket=bucket,
        Key=key
      )
    except ClientError as ce:
      print('ERROR: S3 get object error: %s' %ce)
      raise
    except BotoCoreError as be:
      print('ERROR: BotoCore error: %s' %be)
      raise

    return s3_object
