import json
import os
import time

import boto3

import logging
logger = logging.getLogger(__name__)

LAMBDA_DELAY = 75 / 1000 # 75 ms

def handle(event):
    """ This function will warm a number of concurrent lambdas 
        specified in the concurrent key of the event. If this is missing
        or equal to 1, don't spawn additional lambdas """

    logger.info(json.dumps(event))

    concurrency = int(event.get('concurrency',1))
    sequence = int(event.get('sequence', 1))

    # If sequence and concurrency are one, congrats, we're done.
    if sequence == 1 and concurrency == 1:
        return {'warmed': True}

    func_name = os.environ.get('AWS_LAMBDA_FUNCTION_NAME')
    func_version = os.environ.get('AWS_LAMBDA_FUNCTION_VERSION')

    client = boto3.client('lambda')
    
    # If this is the 'main' invocation, we need to 
    # invoke the additional lambdas
    if sequence == 1:

        for i in range(2,concurrency+1):
            payload = json.dumps({
                'warmer': True,
                'concurrency': 1,
                'sequence': i
            }).encode()

            # They should all be async except for the last.
            # We need to wait for that one to avoid reusing
            # already warmed lambdas.
            invocation_type = 'RequestResponse' if concurrency == i else 'Event'

            logger.info(f"Invoking lambda: {invocation_type} {payload}")

            client.invoke(
                FunctionName=":".join([func_name, func_version]),
                InvocationType=invocation_type,
                Payload=payload
            )

        

    # This means we've been called by the 'main'
    # warming invocation and we should just stall.
    else:
        logger.info("Sleeping.")
        time.sleep(LAMBDA_DELAY)

    return {'warmed':True}