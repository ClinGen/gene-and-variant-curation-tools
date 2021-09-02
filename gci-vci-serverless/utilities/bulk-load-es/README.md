# Bulk Load Elasticsearch
This python applicaiton will read data from a GCI VCI DynamoDB and index it within an existing Elasticsearch Domain. 

## Setup and Prerequisites
The Elastisearch Domain should already exist. This can be created by deploying from the gci-vci-serverless serverless yaml deployment. The bulk loader can be run from an EC2 instance (recommended) or locally. The software will first query each item_type from the DynamoDB table and then push each item_type into a separate index (i.e. one index for interpreation, another for evaluation, etc.) If run locally, you're basically downloading all the data and then pushing it back into the cloud and this will accrue data egress charges (so running this from an EC2 instance is recommended).

1. Checkout code from git
2. cd into gci-vci-serverless/utilities/bulk-load-es/bin
3. Install python requirements (this was tested with python 3.7.10 and also 3.9)
    * `$ python -m venv .venv`
    * `$ source .venv/bin/activate`
    * `$ pip install -r requirements.txt`
4. `$ python load_data.py <DYNAMODB-TABLE-NAME> <ELASTICSEARCH-DOMAIN-ENDPOINT`

## Options and Parameters
usage: load_data.py [-h] [--dynamodb_region DYNAMODB_REGION]
                    [--elasticsearch_region ELASTICSEARCH_REGION]
                    [--item_type ITEM_TYPE]
                    dynamodb_table elasticsearch_domain

#### dynamodb_table [required]
The name of the dynamodb table used as source data.

#### elasticsearch_domain [required]
The Elasticsearch service domain. This can be retrieved from the `Overview` tab in the AWS Elasticsearch Service Console. Should be something similar to: `search-gci-vci-stage-<UNIQUE_ID>.<REGION>.es.amazonaws.com` (no https:// at the beginning)

#### --dynamodb_region
The region where the DynamoDB table is located. Default: default region (env AWS_REGION)

#### --elasticsearch_region
The region where the elasticsearch domain was deployed. Default: default region (env AWS_REGION)

#### --item_type
You can specify a single item type to load, otherwise will index all item types. Currently supported item types:
* evaluation
* interpretation
* affiliation
* snapshot

## Misc
### Conneciton Issues (timeout or 40X status when calling ES Domain Endpoint)
The role that's being used will need to be configured to access the ES Domain Endpoint. For example, if this is run from an EC2 instance, the EC2 Instance Role should be added to the Elasticsearch Access Policy in the AWS Console. 
1. Retrieve the ARN of the instance role attached to the EC2 instance. If none was used, you can create a new role in the IAM console (with EC2 as the princiapal) and attach it to the running EC2 instance.
2. Navigate to the elasticsearch service AWS console. Select the appropriate domain given the stage used to deploy gci-vci-serverless.
3. Under the `Actions` dropdown, select 'Modify access policy'
4. Add the arn of the instance role to Statement.Principal.AWS (this value can be a string or a list, so if it's a string, create a list and add the arn to that list.)
5. Click submit and wait for the ES domain to update (should be < 1 minute)

### Adding Additional Item Types
You can add additional item types by adding the item_type name to the `all_item_types` list in load_data.py on line 10. This will automatically create a new index in the Elasticsearch domain and populate with the appropriate item type from dynamodb. This has only been tested with the 4 item types listed above, but should work for any additional item types.

### Reloading Data
If run twice on the same elastisearch domain, the operation will reload (and overwrite) any items in the index. This can be used to resync the table to the index.