# © 2021 Amazon Web Services, Inc. or its affiliates. All Rights Reserved.
# 
# This AWS Content is provided subject to the terms of the AWS Customer Agreement
# available at http://aws.amazon.com/agreement or other written agreement between
# Customer and either Amazon Web Services, Inc. or Amazon Web Services EMEA SARL or both.

import boto3
from boto3.dynamodb.conditions import Key
    
class DynamoClient():
    def __init__(self, dynamodb_table_name):
        dynamodb = boto3.resource('dynamodb')
        self.table = dynamodb.Table(dynamodb_table_name)

    def get_items(self, pk, keyname, index_name=None, projections=None):
        kwargs = {
            'KeyConditionExpression': Key(keyname).eq(pk),
        }
        if index_name is not None:
            kwargs['IndexName'] = index_name

        if projections is not None:
            kwargs['ProjectionExpression'] = ",".join(projections)

        response = self.table.query(**kwargs)
        return response.get("Items", [])
    
    def update_attr(self, pk, keyname, attr_name, attr_value):
        response = self.table.update_item(
            Key={
                keyname: pk
            },
            UpdateExpression="set #v = :v",
            ExpressionAttributeValues={
                ':v': attr_value
            },
            ExpressionAttributeNames={
                '#v': attr_name
            }
        )

        print(response)