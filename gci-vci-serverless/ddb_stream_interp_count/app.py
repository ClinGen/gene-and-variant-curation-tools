# # © 2021 Amazon Web Services, Inc. or its affiliates. All Rights Reserved.
# # 
# # This AWS Content is provided subject to the terms of the AWS Customer Agreement
# # available at http://aws.amazon.com/agreement or other written agreement between
# # Customer and either Amazon Web Services, Inc. or Amazon Web Services EMEA SARL or both.

# import json, os, copy
# from boto3.dynamodb.types import TypeDeserializer
# import logging

# ############################################################################
# # Initialization activities
# ############################################################################
# logger = logging.getLogger()

# # If run in AWS Lambda, preconfigures a handler for you.
# log_level = os.environ.get('LOG_LEVEL', 'INFO').upper()
# if logger.hasHandlers():
#     logger.setLevel(log_level)
# # If run outside AWS, can still use logging.
# else:
#     logging.basicConfig(level=log_level, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")


# from ddb_stream_interp_count.dynamodb.client import DynamoClient
# gvc_table = DynamoClient(os.environ['GENE_VARIANT_CURATION_TABLE'])
# vp_table = DynamoClient(os.environ['VP_TABLE'])

# status_map = {
#     'Provisioned': 'p',
#     'Approved': 'a',
#     'in_progress': 'i'
# }
# #############################################################################


# def handler(event, context):
#     logger.info(json.dumps(event))
    
#     # Parse the records to determine a set of actions (increment or decrement status counts)
#     logger.info("Generating actions")
#     actions = generate_actions(event.get('Records', []))
#     logger.info("Actions: %s", json.dumps(actions))

#     # Perform the actions
#     logger.info("Performing Actions")
#     perform_actions(actions)
#     logger.info("Done")
    
# def generate_actions(records):
#     """
#     Description: 
#         Will cycle through input records and handle event types.

#     Args: 
#         records [list]: Expects a list of records from a DynamoDB Stream.
#             See https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_streams_StreamRecord.html
    
#     Returns:
#         actions (list): For each input record, will return a dict in the format:
#             {
#                 'variant_pk': "4903abcr..."
#                 'affiliation': 10007,
#                 'actions': {
#                     'Provisioned': -1,
#                     'Approved': 1,
#                     'in_progress': 0
#                 }
#             }

#             where 1 indicates an increment action
#                  -1 indicates a decrement action
#                   0 indicates no change
#     """
#     actions = []
#     for record in records:
#         result = None
#         if record['eventName'] == 'MODIFY':
#             new_raw_item = record['dynamodb']['NewImage']
#             new_item = ddb_deserialize(new_raw_item)
#             old_raw_item = record['dynamodb']['OldImage']
#             old_item = ddb_deserialize(old_raw_item)
#             result = handle_modify(new_item, old_item)
            
#         elif record['eventName'] == 'INSERT':
#             new_raw_item = record['dynamodb']['NewImage']
#             new_item = ddb_deserialize(new_raw_item)
#             result = handle_insert(new_item)
            
#         elif record['eventName'] == 'REMOVE':
#             old_raw_item = record['dynamodb']['OldImage']
#             old_item = ddb_deserialize(old_raw_item)
#             result = handle_remove(old_item)
            
#         if result is not None:
#             actions.append(result)
        
#     return actions

# def perform_actions(actions):
#     """
#     Description: 
#         Will perform increment/decrement actions on VP aggregate object given
#         a list of actions (returned from generate_actions())

#     Args:
#         actions (list): See return value from generate_actions()
    
#     Returns:
#         success (bool): True on success.
#     """
    
#     for action in actions:
#         # If we have all zeroes, skip.
#         num_changes = sum([abs(v) for v in action['actions'].values()])
#         if num_changes == 0:
#             logger.info("Skipping actions for %s because no actions required", action)
#             continue
    
#         # Grab the carId for the variant
#         carId = get_car_id(action['variant_pk'])
#         if carId is None:
#             logger.info("Did not find carId in GVC table variant PK: %s", action['variant_pk'])
#             continue
        
#         # Grab the aggregation/count object from VP table
#         aggregate = None
#         try:
#             aggregate, vppk = get_variant_aggregate(carId)
#         except Exception as e:
#             logger.info("Exception when retrieving aggregate: %s: %s", type(e).__name__, e)
#             logger.info("Could not find vciStatus for variant: PK: %s, carId: %s", action['variant_pk'], carId)
#             continue

#         if aggregate is None:
#             logger.info("Could not find vciStatus for variant: PK: %s, carId: %s", action['variant_pk'], carId)
#             continue
        
#         # Update the aggregate object with actions
#         updated_aggregate = update_aggregate_object(aggregate, action['actions'], action['affiliation'])
        
#         # And write it back to the database
#         write_aggregate(updated_aggregate, vppk)
        
#     return True



# def get_variant_aggregate(carId):
#     items = vp_table.get_items(
#         pk=carId, 
#         keyname='carId',
#         index_name='carId_index',
#         projections=['PK']
#     )

#     pk = None
#     if len(items) == 1:
#         pk = items[0].get('PK', None)

#     if pk is None:
#         raise ValueError(f"Could not find PK for carId {carId}")

#     items = vp_table.get_items(
#         pk=pk,
#         keyname='PK',
#         projections=['vciStatus']
#     )

#     agg = None
#     if len(items) == 1:
#         agg = items[0].get('vciStatus', None)

#     if agg is None:
#         raise ValueError(f"Could not find vciStatus for PK {pk}")

#     return agg, pk

# def update_aggregate_object(aggregate, actions, affiliation=None):

#     # Create a deep copy so we don't change the original.
#     updated_aggregate = copy.deepcopy(aggregate)

#     # If we have no affiliation, this is 'individual' interpretation,
#     # which is represented as 'd'.
#     if affiliation is None or affiliation == '':
#         affiliation = 'd' # Individual

#     # If we don't have this affiliation yet in the aggregate object.
#     if affiliation not in aggregate:
#         updated_aggregate[affiliation] = _populate_new_status_dict(actions)

#     # If the interpretation is not associated with an affiliation (i.e. individual)
#     elif affiliation == 'd':
#         aff = updated_aggregate[affiliation]
#         _update_status_dict(actions, aff)

#     # Or if it's associated with an affiliation
#     else:
#         logger.info("Found aff in updated_aggregate")
#         aff = updated_aggregate[affiliation]
#         _update_status_dict(actions, aff)    
            
#     # Now, we need to update the 'a' portion of the dict (except for individuals).
#     # This counts the number of affiliations which contain an interpretation for this 
#     # variant in each state.
#     if affiliation != 'd':
#         if 'a' not in updated_aggregate:
#             updated_aggregate['a'] = _populate_new_status_dict(actions)
#         else:
#             for status,key in status_map.items():
#                 # If we don't need to do anything, skip it.
#                 if actions[status] == 0:
#                     continue

#                 if key in updated_aggregate['a']:
#                     updated_aggregate['a'][key] += actions[status]
#                 else:
#                     if actions[status] == -1:
#                         raise ValueError("Tried to decrement missing count.")
#                     updated_aggregate['a'][key] = 1

#     return updated_aggregate

# def _update_status_dict(actions, status_dict):
#     for status,key in status_map.items():
#         logger.info(f"{status} {key}, {actions[status]}")
#         if key in status_dict:
#             status_dict[key] += actions[status]

#             if status_dict[key] < 0:
#                 raise ValueError(f"Error: count is now less than zero.")
            
#         elif actions[status] == 1:
#             status_dict[key] = 1
#         elif actions[status] == -1:
#             raise ValueError(f"Tried to decrement non-existing value")

# def _populate_new_status_dict(actions):
#     tmp = {}
#     for status,key in status_map.items():
#         if actions[status] == 1:
#             tmp[key] = 1
#         elif actions[status] == -1:
#             logger.info(f"Attempting to decrement {status} but did not find aggregate object.")
#             raise ValueError("Did not find affiliation in vciStatus and tried decrement action. Invalid state.")
#     return tmp

# def write_aggregate(updated_aggregate, vppk):
#     logger.info("Writing: %s", updated_aggregate)
#     vp_table.update_attr(vppk, 'PK', 'vciStatus', updated_aggregate)
#     return True

# def get_car_id(variant_pk):
#     items = gvc_table.get_items(variant_pk, "PK", projections=["carId"])
    
#     retval = None
#     if len(items) != 0:
#         retval = items[0].get('carId', None)
#     return retval


# def handle_insert(new_item):
#     if new_item.get('item_type', None) != 'interpretation':
#         return None
        
#     new_status = get_interpretation_status(new_item)
    
#     return {
#         'variant_pk': new_item['variant'],
#         'affiliation': new_item['affiliation'],
#         'actions': new_status
#     }

# def handle_modify(new_item, old_item):
#     if new_item.get('item_type', None) != 'interpretation':
#         return None
        
#     new_status = get_interpretation_status(new_item)
#     old_status = get_interpretation_status(old_item)
    
#     # This will give us 1 for increment, 0 for stay the same or -1 for decrement
#     actions = {k:(v - old_status[k]) for k,v in new_status.items()}
    
#     return {
#         'variant_pk': new_item['variant'],
#         'affiliation': new_item['affiliation'],
#         'actions': actions
#     }
    
# def handle_remove(old_item):
#     if old_item.get('item_type', None) != 'interpretation':
#         return None

#     old_status = get_interpretation_status(old_item)
#     actions = {k:(0-v) for k,v in old_status.items()}
#     return {
#         'variant_pk': old_item['variant'],
#         'affiliation': old_item['affiliation'],
#         'actions': actions
#     }


# def get_interpretation_status(interpretation):
#     statuses = {
#         'in_progress': 0,
#         'Provisioned': 0,
#         'Approved': 0
#     }
    
#     assoc_interp_snaps = []
#     try:
#         assoc_interp_snaps = interpretation['provisionalVariant']['associatedInterpretationSnapshots']
#     except KeyError as e:
        
#         # This means that the interpretation record didn't have any related snapshots, which indicates the 
#         # variant is in progress state.
#         statuses['in_progress'] = 1
    
#     # Or maybe the key exists but contains an empty list; this mean in progress.
#     if len(assoc_interp_snaps) == 0:
#         statuses['in_progress'] = 1
        
#     else:
#         # Grab the unique set of statuses and update the statuses hash with
#         # one for each status found. 
#         for ustatus in set([snap['approvalStatus'] for snap in assoc_interp_snaps]):
#             logger.info("Found status %s", ustatus)
#             try:
#                 # This will raise a key error for an unexpected status:
#                 tmp = statuses[ustatus]
#             except KeyError as e:
#                 raise KeyError(f"Unexpected status {ustatus} found in snapshot")
                
#             statuses[ustatus] = 1
        
#     return statuses


# def ddb_deserialize(r, type_deserializer = TypeDeserializer()):
#     return type_deserializer.deserialize({"M": r})

# if __name__ == "__main__":
#     context = []
#     with open("test_event.json", "r") as f:
#         event = json.loads(f.read())

#     handler(event, context)

# VERSION SENT FROM GLORIA 8/6/21
# © 2021 Amazon Web Services, Inc. or its affiliates. All Rights Reserved.
# 
# This AWS Content is provided subject to the terms of the AWS Customer Agreement
# available at http://aws.amazon.com/agreement or other written agreement between
# Customer and either Amazon Web Services, Inc. or Amazon Web Services EMEA SARL or both.

import json, os, copy
from boto3.dynamodb.types import TypeDeserializer
import logging

############################################################################
# Initialization activities
############################################################################
logger = logging.getLogger()

# If run in AWS Lambda, preconfigures a handler for you.
log_level = os.environ.get('LOG_LEVEL', 'INFO').upper()
if logger.hasHandlers():
    logger.setLevel(log_level)
# If run outside AWS, can still use logging.
else:
    logging.basicConfig(level=log_level, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")


from ddb_stream_interp_count.dynamodb.client import DynamoClient
gvc_table = DynamoClient(os.environ['GENE_VARIANT_CURATION_TABLE'])
vp_table = DynamoClient(os.environ['VP_TABLE'])

status_map = {
    'Provisioned': 'p',
    'Approved': 'a',
    'in_progress': 'i'
}
#############################################################################


def handler(event, context):
    logger.info(json.dumps(event))
    
    # Parse the records to determine a set of actions (increment or decrement status counts)
    logger.info("Generating actions")
    actions = generate_actions(event.get('Records', []))
    logger.info("Actions: %s", json.dumps(actions))

    # Perform the actions
    logger.info("Performing Actions")
    perform_actions(actions)
    logger.info("Done")
    
def generate_actions(records):
    """
    Description: 
        Will cycle through input records and handle event types.

    Args: 
        records [list]: Expects a list of records from a DynamoDB Stream.
            See https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_streams_StreamRecord.html
    
    Returns:
        actions (list): For each input record, will return a dict in the format:
            {
                'variant_pk': "4903abcr..."
                'affiliation': 10007,
                'actions': {
                    'Provisioned': -1,
                    'Approved': 1,
                    'in_progress': 0
                }
            }

            where 1 indicates an increment action
                 -1 indicates a decrement action
                  0 indicates no change
    """
    actions = []
    for record in records:
        result = None
        if record['eventName'] == 'MODIFY':
            new_raw_item = record['dynamodb']['NewImage']
            new_item = ddb_deserialize(new_raw_item)
            old_raw_item = record['dynamodb']['OldImage']
            old_item = ddb_deserialize(old_raw_item)
            result = handle_modify(new_item, old_item)
            
        elif record['eventName'] == 'INSERT':
            new_raw_item = record['dynamodb']['NewImage']
            new_item = ddb_deserialize(new_raw_item)
            result = handle_insert(new_item)
            
        elif record['eventName'] == 'REMOVE':
            old_raw_item = record['dynamodb']['OldImage']
            old_item = ddb_deserialize(old_raw_item)
            result = handle_remove(old_item)
            
        if result is not None:
            actions.append(result)
        
    return actions

def perform_actions(actions):
    """
    Description: 
        Will perform increment/decrement actions on VP aggregate object given
        a list of actions (returned from generate_actions())

    Args:
        actions (list): See return value from generate_actions()
    
    Returns:
        success (bool): True on success.
    """
    
    for action in actions:
        # If we have all zeroes, skip.
        num_changes = sum([abs(v) for v in action['actions'].values()])
        if num_changes == 0:
            logger.info("Skipping actions for %s because no actions required", action)
            continue
    
        # Grab the carId for the variant
        carId = get_car_id(action['variant_pk'])
        if carId is None:
            logger.info("Did not find carId in GVC table variant PK: %s", action['variant_pk'])
            continue
        
        # Grab the aggregation/count object from VP table
        aggregate = None
        try:
            aggregate, vppk = get_variant_aggregate(carId)
        except Exception as e:
            logger.info("Exception when retrieving aggregate: %s: %s", type(e).__name__, e)
            logger.info("Could not find vciStatus for variant: PK: %s, carId: %s", action['variant_pk'], carId)
            continue

        if aggregate is None:
            logger.info("Could not find vciStatus for variant: PK: %s, carId: %s", action['variant_pk'], carId)
            continue
        
        # Update the aggregate object with actions
        updated_aggregate = update_aggregate_object(aggregate, action['actions'], action['affiliation'])
        
        # And write it back to the database
        write_aggregate(updated_aggregate, vppk)
        
    return True



def get_variant_aggregate(carId):
    items = vp_table.get_items(
        pk=carId, 
        keyname='carId',
        index_name='carId_index',
        projections=['PK']
    )

    pk = None
    if len(items) == 1:
        pk = items[0].get('PK', None)

    if pk is None:
        raise ValueError(f"Could not find PK for carId {carId}")

    items = vp_table.get_items(
        pk=pk,
        keyname='PK',
        projections=['vciStatus']
    )

    agg = None
    if len(items) == 1:
        agg = items[0].get('vciStatus', None)

    if agg is None:
        raise ValueError(f"Could not find vciStatus for PK {pk}")

    return agg, pk

def update_aggregate_object(aggregate, actions, affiliation=None):

    # Create a deep copy so we don't change the original.
    updated_aggregate = copy.deepcopy(aggregate)

    # If we have no affiliation, this is 'individual' interpretation,
    # which is represented as 'd'.
    if affiliation is None or affiliation == '':
        affiliation = 'd' # Individual

    # If we don't have this affiliation yet in the aggregate object.
    if affiliation not in aggregate:
        updated_aggregate[affiliation] = _populate_new_status_dict(actions)

    # If the interpretation is not associated with an affiliation (i.e. individual)
    elif affiliation == 'd':
        aff = updated_aggregate[affiliation]
        _update_status_dict(actions, aff)

    # Or if it's associated with an affiliation
    else:
        logger.info("Found aff in updated_aggregate")
        aff = updated_aggregate[affiliation]
        _update_status_dict(actions, aff)    
            
    # Now, we need to update the 'a' portion of the dict (except for individuals).
    # This counts the number of affiliations which contain an interpretation for this 
    # variant in each state.
    if affiliation != 'd':
        if 'a' not in updated_aggregate:
            updated_aggregate['a'] = _populate_new_status_dict(actions)
        else:
            for status,key in status_map.items():
                # If we don't need to do anything, skip it.
                if actions[status] == 0:
                    continue

                if key in updated_aggregate['a']:
                    updated_aggregate['a'][key] += actions[status]
                else:
                    if actions[status] == -1:
                        raise ValueError("Tried to decrement missing count.")
                    updated_aggregate['a'][key] = 1

    return updated_aggregate

def _update_status_dict(actions, status_dict):
    for status,key in status_map.items():
        logger.info(f"{status} {key}, {actions[status]}")
        if key in status_dict:
            status_dict[key] += actions[status]

            if status_dict[key] < 0:
                raise ValueError(f"Error: count is now less than zero.")
            
        elif actions[status] == 1:
            status_dict[key] = 1
        elif actions[status] == -1:
            raise ValueError(f"Tried to decrement non-existing value")

def _populate_new_status_dict(actions):
    tmp = {}
    for status,key in status_map.items():
        if actions[status] == 1:
            tmp[key] = 1
        elif actions[status] == -1:
            logger.info(f"Attempting to decrement {status} but did not find aggregate object.")
            raise ValueError("Did not find affiliation in vciStatus and tried decrement action. Invalid state.")
    return tmp

def write_aggregate(updated_aggregate, vppk):
    logger.info("Writing: %s", updated_aggregate)
    vp_table.update_attr(vppk, 'PK', 'vciStatus', updated_aggregate)
    return True

def get_car_id(variant_pk):
    items = gvc_table.get_items(variant_pk, "PK", projections=["carId"])
    
    retval = None
    if len(items) != 0:
        retval = items[0].get('carId', None)
    return retval


def handle_insert(new_item):
    if new_item.get('item_type', None) != 'interpretation':
        return None
        
    new_status = get_interpretation_status(new_item)
    
    return {
        'variant_pk': new_item['variant'],
        'affiliation': new_item['affiliation'],
        'actions': new_status
    }

def handle_modify(new_item, old_item):
    if new_item.get('item_type', None) != 'interpretation':
        return None
        
    new_status = get_interpretation_status(new_item)
    old_status = get_interpretation_status(old_item)
    
    # This will give us 1 for increment, 0 for stay the same or -1 for decrement
    actions = {k:(v - old_status[k]) for k,v in new_status.items()}
    
    return {
        'variant_pk': new_item['variant'],
        'affiliation': new_item['affiliation'],
        'actions': actions
    }
    
def handle_remove(old_item):
    if old_item.get('item_type', None) != 'interpretation':
        return None

    old_status = get_interpretation_status(old_item)
    actions = {k:(0-v) for k,v in old_status.items()}
    return {
        'variant_pk': old_item['variant'],
        'affiliation': old_item['affiliation'],
        'actions': actions
    }


def get_interpretation_status(interpretation):
    statuses = {
        'in_progress': 0,
        'Provisioned': 0,
        'Approved': 0
    }
    
    assoc_interp_snaps = []
    if 'snapshots' in interpretation:
        # Grab the unique set of statuses and update the statuses hash with
        # one for each status found.
        for snapshotPK in interpretation['snapshots']:
            items = gvc_table.get_items(snapshotPK, "PK", projections=["approvalStatus"])
            if len(items) == 1:
                ustatus = items[0].get('approvalStatus', None)
                logger.info("Found status %s", ustatus)
                try:
                    # This will raise a key error for an unexpected status:
                    tmp = statuses[ustatus]
                except KeyError as e:
                    raise KeyError(f"Unexpected status {ustatus} found in snapshot")

                statuses[ustatus] = 1
    else:
        # This means that the interpretation record didn't have any related snapshots, which indicates the 
        # variant is in progress state.
        statuses['in_progress'] = 1

    return statuses


def ddb_deserialize(r, type_deserializer = TypeDeserializer()):
    return type_deserializer.deserialize({"M": r})

if __name__ == "__main__":
    context = []
    with open("test_event.json", "r") as f:
        event = json.loads(f.read())

    handler(event, context)
