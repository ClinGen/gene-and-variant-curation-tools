import json
import os
import traceback
import boto3

import logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

class Client:
    PARTITION_KEY='api_key_value'
    ROLES_COLNAME='roles'
    AFFILIATIONS_COLNAME='affiliations'

    def __init__(self, table_name, is_offline=False):
        logger.info(f"Setting table name: {table_name}")
        self.table_name = table_name
        if(os.getenv('IS_OFFLINE', False)):
            logger.info("Setting is_offline to true")
            self.ddb_resource = boto3.resource('dynamodb', endpoint_url="http://localhost:8000")
        else:
            self.ddb_resource = boto3.resource('dynamodb')
        self.table = self.ddb_resource.Table(self.table_name)

    def get_key_info(self, api_key):
        """ Will retrieve information about an API Key from 
        the database. 

        args:
            api_key: value of the api key
        returns:
            api_key_info: dict with keys: roles:[], affiliations:[] *Note, api key value is removed.
        raises:
            APIKeyNotFoundException: if api key was not found in database.
        """
        response = self.table.get_item(
            Key={
                self.PARTITION_KEY: api_key
            }
        )

        data = response.get('Item', None)
        if data is None:
            raise APIKeyNotFoundException("Could not find API key in database")

        # Remove the actual API Key value from the response
        del data[self.PARTITION_KEY]

        logger.info(f"Retrieved item from database. Data {data}")

        return data

    def put_or_overwrite_key(self, api_key, roles=None, affiliations=None):
        """ Will create a new item in the database for the specified key value 
        or overwrite an existing value if the key already exists

        args:
            api_key: Value of api key
            roles: List of roles to associate with api key
            affiliations: List of affiliation ids to associate with key
        returns:
            success: (bool) If the operation was successful.
        """
        if roles is None:
            roles = []

        if affiliations is None:
            affiliations = []

        response = self.table.put_item(
            Item={
                self.PARTITION_KEY: api_key,
                self.ROLES_COLNAME: roles,
                self.AFFILIATIONS_COLNAME: affiliations
            }
        )

        logger.info(f"put or overwrite item. Response: {response}")

        return True

    def delete_key(self, api_key):
        """ Will delete a record from the database for given api key

        args: 
            api_key: (str) API Key value
        returns:
            success: (bool) true on success
        raises:
            APIKeyNotFoundExeption if no api key 
        """
        response = self.table.delete_item(
            Key={
                self.PARTITION_KEY: api_key
            }
        )

        logger.info(f"Delete item. Response: {response}")

        return True
        
    
class APIKeyNotFoundException(Exception):
    """ Raised if API Key was not found in the database """

class APIKeyAlreadyExistsException(Exception):
    """ Raise if trying to add a new API Key and one already exists """