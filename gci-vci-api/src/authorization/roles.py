from enum import Enum

class Role(Enum):
    """ Used to define valid role types """
    admin = 'admin'
    curator = 'curator'
    user = 'user'