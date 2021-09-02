import datetime
import uuid

def build(vp):
    """ Builds a new Individual item with default values for required fields
    and combines any fo the given attributes.
    """
    vp['hgnc'] = vp['hgnc'][0]
    pk = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    vp.update({
        'date_created': now,
        'last_modified': now
    })
    vp.update({
    'PK': pk,
    'item_type': 'variant'
    })

    return vp

