import argparse
import logging

import boto3
from boto3.dynamodb.conditions import Key
import pandas as pd

logger = logging.getLogger()

genes = ['PTEN','PAH', 'CDH1', 'GAA', 'RUNX1', 
        'USH2A','GJB2','KCNQ4','SLC26A4']

def main():
    # Parse the command line arguments
    args = parse_args()

    # Configure logging
    configure_logger(args.verbose)

    # Connect to GCI VCI table
    gvc_table = connect(args.gvc_table)

    dfv = get_variants_df(gvc_table, genes)
    dfi = get_interpretations_df(gvc_table)
    dfvi = pd.merge(dfv,dfi, on="variant")
    dfvi = pd.concat([dfvi, dfvi.apply(get_snap_statuses, axis=1).apply(pd.Series)],axis=1)\
        .drop(['provisionalVariant'],axis=1)
    logger.info("Found %d variant/interpretations after merge", len(dfvi))

    # Create a dictionay keyed by carId which represents each affiliation in vciStatus
    affs_df_agg = dfvi[dfvi.affiliation != ''].groupby(['carId','affiliation']).count()
    affiliations = affs_df_agg[['i','a','p']].groupby(level=0)\
        .apply(lambda df: df.xs(df.name).to_dict('index')).to_dict()

    # Create a dictionary keyed by carId which represents the 'a' (total affiliation)
    a_agg_all = dfvi[dfvi.affiliation != ''].groupby(['carId']).count()
    a_agg = a_agg_all[['i','a','p']].to_dict('index')

    # Create a dictionary keyed by carId which represents the 'd' portion (total individual, non affiliated)
    d_agg_all = dfvi[dfvi.affiliation == ''].groupby(['carId']).count()
    d_agg = d_agg_all[['i','a','p']].to_dict('index')

    vpt_table = connect(args.vpt_table)
    load_aggregates(affiliations, a_agg, d_agg, vpt_table, dry_run=args.dry_run)

##############################################################################################################
def load_aggregates(affiliations, a_agg, d_agg, table, dry_run=False):
    """
    Description: Will take a dict of affiliation statuses, total affiliation, and individual and load them
        into the VP database.

    Args:
        affiliations (dict): Keyed on carId. Expects a similar format to
            '<carId>': {
                '<AFFIL>: {
                    'i': 0     # The number of interpretations associated with this carId, affiliation combo
                           # which are in progress.
                    'a': 1     # Number of combos that have a snapshot in Approved status.
                    'p': 1     # Number of combos that have a Provisioned status.
                }
            }

        a_agg (dict): Keyed on carId, sum of all Affiliation dicts for this carId
            '<carId>': {
                'i': 3,
                'a': 5,
                'p': 6
            }

        d_agg (dict): Keyed on carId, sum of all interpretations without an affiliation which has a snapshot in the recorded status.
            '<carId>': {
                'i': 2,
                'a': 3,
                'p': 4,
            }

    Returns:
        success (bool): True on success
    """
    unique_keys = set( list(affiliations) + list(a_agg) + list(d_agg) )
    total_statuses_loaded = 0

    for carId in unique_keys:
        # Get the PK
        pk = get_pk_by_carId(carId, table)
        if pk is None:
            logger.info("Did not find PK in VPT Table for %s. Skipping.", carId)
            continue

        logger.debug("Found PK %s for carId %s", pk, carId)
    
        # Construct the VCI Status Object
        vciStatus = {}
        if carId in affiliations:
            vciStatus = affiliations[carId]
        if carId in a_agg:
            vciStatus['a'] = a_agg[carId]
        if carId in d_agg:
            vciStatus['d'] = d_agg[carId]
        
        logger.debug("vciStatus: %s", vciStatus)
        
        if dry_run:
            logger.info("Dry Run: Not loading:")
            logger.info("[%s] %s: %s", carId, pk, vciStatus)
        else:
            total_statuses_loaded += 1
            load_vci_status(vciStatus, pk, table)

    logger.info("Loaded vciStatus for %d VP variants", total_statuses_loaded)
    return True

def load_vci_status(vciStatus, pk, table):
    """
    Description: Loads an individual vciStatus given a PK and status dict.

    Args:
        vciStatus (dict): VCI Status dict in format similar to
            {
                '10007': {'i': 0, 'a': 1, 'p': 1}
                '10008': {'i', 0, 'a': 1, 'p': 1}
                'a': {'i': 0, 'a': 1, 'p': 1},
                'd': {'i': 1, 'a': 0, 'p': 0}
            }
        
        pk (str): Primary Key of object to load vciStatus into (vpt_table)

        table (dynamodb.Table): Database connection

    Returns:
        success (bool): True on success
    """
    response = table.update_item(
        Key={
            "PK": pk
        },
        UpdateExpression="set vciStatus=:v",
        ExpressionAttributeValues={
            ':v': vciStatus
        }
    )
    logger.debug("Load response: %s", response)
    return True

def get_pk_by_carId(carId, vpt_table):
    """
    Description: Will query the vpt table and retrieve the variant PK by carId.

    Args:
        carId (str): The carId used to lookup the PK
        vpt_table (dynamodb.Table): Database connection

    Returns:
        pk (str or None): PK if found, None otherwise.
    """
    response = vpt_table.query(
        IndexName='carId_index',
        KeyConditionExpression=Key('carId').eq(carId),
        ProjectionExpression='PK'
    )
    items = response.get('Items', [])
    if len(items) == 0:
        return None

    pk = items[0].get('PK', None)
    return pk

def get_snap_statuses(r):
    """
    Description: Helper function for pandas apply() function. Retrieves the associatedInterpretationSnapshots
        from the provisionalVariant column and parses out the statuses in a format expected in the vciStatus
        column.

    Args:
        r (pandas row): A row in a pandas dataframe of GVC Interpretation item type
    
    Retval:
        retval (dict): A summary of snapshot statuses for the interp in a similar format to:
            {'i': 0, 'a': 1, 'p': 1}
    """
    tmp = []
    if 'provisionalVariant' in r:
      if 'associatedInterpretationSnapshots' in r['provisionalVariant']:
        for snap in r.provisionalVariant.get('associatedInterpretationSnapshots', []):
            tmp.append(snap['approvalStatus'])
      
    retval = {}
    if len(tmp) == 0:
        retval['i'] = 1
    if 'Approved' in tmp:
        retval['a'] = 1
    if 'Provisioned' in tmp:
        retval['p'] = 1
    return retval 

def get_variants_df(table, genes=None):
    """
    Description: Queries all variants from gvc table, filters thos which contain a carId and 
        then filters based on a list of gene names.

    Args:
        table (dynamodb.Table): Database connection (Gene variant curation table)
        genes (list): List of gene names. Does a substring match against the preferredTitle columns.
            ** WARNING ** Some gene names are substrings of others (ex. EGF and EGFR) and may 
            return more genes than expected.

    Returns:
        dvf (pandas.DataFrame): Data frame object of variants with columns variant, carId, preferredTitle
    """
    kwargs = {
        'IndexName':"item_type_index",
        'KeyConditionExpression':Key('item_type').eq('variant'),
        'ProjectionExpression':"PK,carId,preferredTitle"
    }
    items = _query(table, kwargs)
    dfv = pd.DataFrame.from_dict(items).rename(index=str, columns={"PK": "variant"})\
        .fillna("")

    search_values = genes
    dfv = dfv[dfv.carId !='']
    if genes is not None:
        dfv = dfv[dfv.preferredTitle.str.contains( '|'.join(search_values) )]

    logger.info("Retrieved %d variants with a carId", len(dfv))
    return dfv

def get_interpretations_df(table):
    """
    Description: Queries all interpretations from gvc table.

    Args:
        table (dynamodb.Table): Database connection (Gene variant curation table)

    Returns:
        dvf (pandas.DataFrame): Data frame object of interpretations with columns:
            interpretation, provisionalVariant, affiliation
    """
    kwargs = {
        'IndexName':"item_type_index",
        'KeyConditionExpression':Key('item_type').eq('interpretation'),
        'ProjectionExpression':"PK,variant,provisionalVariant,affiliation"
    }
    items = _query(table, kwargs)
    dfi = pd.DataFrame.from_dict(items).rename(index=str, columns={"PK" : "interpretation"})\
        .fillna("")
    logger.info("Retrieved %d interpretations", len(dfi))
    return dfi

def _query(table, kwargs):
    items = []
    last_evaluated_key = "init"
    
    while last_evaluated_key is not None:
        if last_evaluated_key != "init":
            kwargs['ExclusiveStartKey'] = last_evaluated_key

        resp = table.query(**kwargs)
        last_evaluated_key = resp.get('LastEvaluatedKey', None)
        items.extend(resp.get('Items', []))
    
    return items

############### Util ####################
def configure_logger(verbosity):
    """ Helper method for configuing logger level and format. Higher numbers are less verbose."""
    default_level = 40
    log_level = default_level - (verbosity*10)
    logging.basicConfig(level=log_level, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

def parse_args():
    """ Parses arguments """
    parser = argparse.ArgumentParser(description="Calculate VCI Status for VPT table.")
    parser.add_argument('gvc_table', metavar="GeneVariantCuration-TableName",
        help="Name of the GeneVariantCuration table (origination)")
    parser.add_argument('vpt_table', metavar="GeneVariantVPT-TableName", 
        help="Name of the VPT Table (destination)")
    parser.add_argument('--dry_run','-d', action='store_true', 
        help="Will not load into database.")
    parser.add_argument('-v', '--verbose', action='count', default=0,
        help='Increase logging verbosity [-v, -vv, -vvv]')

    args = parser.parse_args()
    return args


def connect(table_name):
    """ Connects to dynamo tables. """
    logger.info("Connecting to table: %s", table_name)
    dynamodb = boto3.resource('dynamodb')
    return dynamodb.Table(table_name)


if __name__ == "__main__":
    main()