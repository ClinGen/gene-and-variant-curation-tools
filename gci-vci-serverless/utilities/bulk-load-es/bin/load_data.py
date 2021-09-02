import json, time
import argparse
import logging

from bulk_loader import DynamoToElasticsearchBulkLoader

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

all_item_types = ['interpretation', 'evaluation', 'snapshot', \
    'affiliation','variant', 'gene','disease', 'article',\
        'curated-evidence', 'caseControl','user' ]

def parse_args():
    parser = argparse.ArgumentParser(description='Load data from DynamoDB to Elasticsearch (by index_type)')
    parser.add_argument('dynamodb_table', help="Name of the originating DynamoDB Table")
    parser.add_argument('elasticsearch_domain', help="Endpoint for the Elasticsearch Domain (do not include https://)")
    parser.add_argument('--dynamodb_region', help="Region of the dynamodb table")
    parser.add_argument('--elasticsearch_region', help="Region of the elasticsearch domain")
    parser.add_argument('--item_type', help="Specificy a single item type to load. Default: all item_type")
    return parser.parse_args()

def main(args):
    loader_opts = {}
    if args.dynamodb_region:
        loader_opts['dynamodb_region'] = args.dynamodb_region
    
    if args.elasticsearch_region:
        loader_opts['es_region'] = args.elasticsearch_region

    logger.info(loader_opts)

    loader = DynamoToElasticsearchBulkLoader(args.dynamodb_table, args.elasticsearch_domain, **loader_opts)

    if args.item_type:
        if args.item_type in all_item_types:
            logger.info(f"Loading {args.item_type}")
            loader.index_item_type(args.item_type)
        else:
            raise ValueError(f"Invalid item type: {args.item_type}")
    else:
        logger.info("Indexing all item types")
        for item_type in all_item_types:
            logger.info(f"Loading {item_type}")
            loader.index_item_type(item_type)

if __name__ == "__main__":
    args = parse_args()
    main(args)
    