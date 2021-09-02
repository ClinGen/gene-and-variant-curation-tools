import os

from ..db.api_key_table import Client, APIKeyNotFoundException
from .roles import Role

import logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

class UnauthorizedException(Exception):
    """ Used to short circuit authorization checking logic """

class AuthorizedException(Exception):
    """ Used to short circuit authorization checking logic """

class Authorizer():

    def authorize(self, key_info, event):    
        ################################################
        # Add logic to determine if key is authorized to 
        # make a call.
        # Placeholder for now, just allow admin
        ################################################
        try:
            self._authorize_roles(key_info, event)
            self._authorize_affiliations(key_info, event)

        except AuthorizedException:
            # If we short circuited and will allow the call (for example, if user is admin)
            return True
        except UnauthorizedException as e:
            # Raised when the user is not authorized. Return false.
            logger.info("Unauthorized: " + str(e))
            return False

        return True

    def _authorize_roles(self, key_info, event):
        """ Will authorize the provided event given the key_info based on roles.
            Currently a placeholder. We may consider breaking function out 
            into it's own class as the logic may become more complicated.
        
        args:
            key_info: (dict) Containing (at least) a key 'roles':[]
            event: (dict) The event object passed from API Gateway

        returns:
            success (bool): Will return true on success

        raise:
            UnauthorizedException: Returns this exception if api key is not
                authorized.
        """

        # Admins can do anything
        if Role.admin.value in key_info['roles']:
            raise AuthorizedException("User is admin")

        # For now, limit affiliations resource to admins 
        # for demonstration puproses.
        if event['path'].startswith('/affiliations') or event['path'].startswith('/interpretations'):
            raise UnauthorizedException("Only admins can access affiliations or interpretations resource")

        return True


    def _authorize_affiliations(self, key_info, event):
        """ Will authorize the provided affiliations given the key_info.
            Will first check to see if a query string parameter was passed
            via queryStringParameters. If there were no queryStringParameters
            or `affiliation` was not provided, will return True.
        
        args:
            key_info: (dict) Containing (at least) a key 'affiliations':[]
            event: (dict) The event object passed from API Gateway

        returns:
            success (bool): Will return true on success

        raise:
            UnauthorizedException: Returns this exception if api key is not
                authorized.
        """
        query_string_parameters = event['queryStringParameters']
        if query_string_parameters is None or 'affiliation' not in query_string_parameters:
            return True
        
        if query_string_parameters['affiliation'] not in key_info['affiliations']:
            raise UnauthorizedException("Did not find affiliation in api keys affiliation list")

        return True

