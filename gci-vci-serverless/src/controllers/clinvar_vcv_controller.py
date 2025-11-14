import json
from src.clients import clinvar_vcv_client
from src.clients.clinvar_vcv_client import ClientError

def handle(event):
    PARAM_VCV = "vcv"
    PARAM_SCV = "scv"
    params = event.get("pathParameters", {})
    response = {}

    http_method = event["httpMethod"]
    if http_method == "GET":
        if PARAM_VCV in params and params[PARAM_VCV] is not None:
            if PARAM_SCV in params and params[PARAM_SCV] is not None:
                response = find(params[PARAM_VCV], params[PARAM_SCV])
            else:
                # Can be used if need to verify VCV Id (not used now)
                response = find(params[PARAM_VCV])
        else:
            response = { "statusCode": 400, "body": "VCV id not in params." }
    else:
        response = { "statusCode": 400, "body": json.dumps({ "error": "Unrecognized request " + httpMethod + " for /clinvar-vcv" }) }

    return response


# Retrieve ClinVar VCV or VCV & SCV accession 
def find(vcv_id, scv_id=None):
    # A basic check of provided data to avoid unnecessary DB querying
    if vcv_id is None or len(vcv_id) == 0:
        return { 'statusCode': 400, 'body': json.dumps({ 'error': 'Missing required data VCV Id for /clinvar-vcv.' }) }

    # Can be used if need to verify VCV Id (not used now)
    if scv_id is None or len(scv_id) == 0:
        # Retrieve ClinVar VCV
        try:
            found = clinvar_vcv_client.find(vcv_id, None, None)
            found["vcvId"] = vcv_id
            response = { "statusCode": 200, "body": json.dumps(found) }
        except ClientError as e:
            response = { "statusCode": 400, "body": json.dumps({ "error": "Failed fetching VCV from ClinVar\n%s" %e }) }
    else:
        # Retrieve a SCV specified version accession from a specified VCV  
        # check scv_id has a version which is required
        if scv_id.count(".") == 1:
            id_version_arr = scv_id.split(".")
            if len(id_version_arr) == 2 and len(id_version_arr[0]) > 0 and len(id_version_arr[1]) > 0:
                accession_id = id_version_arr[0] 
                accession_version = id_version_arr[1]
            else:
                # If no SCV version, return error
                return { 'statusCode': 400, 'body': json.dumps({ 'error': 'SCV version is required for /clinvar-vcv.' }) }
        else:
            # If no SCV version, return error
            return { 'statusCode': 400, 'body': json.dumps({ 'error': 'SCV version is required for /clinvar-vcv.' }) }

        # Retrieve ClinVar SCV
        try:
            found = clinvar_vcv_client.find(vcv_id, accession_id, accession_version)
            # Add VCV Id and SCV Id to return data
            found["vcvId"] = vcv_id
            found["scvId"] = scv_id
            response = { "statusCode": 200, "body": json.dumps(found) }
        except ClientError as e:
            response = { "statusCode": 400, "body": json.dumps({ "error": "%s" %e.message }) }

    return response
