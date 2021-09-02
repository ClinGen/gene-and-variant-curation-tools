import json
import pytest

from src.db import ddb_client

from botocore.exceptions import ClientError
from botocore.exceptions import BotoCoreError

@pytest.fixture(scope='module')
def clinvar_variant():
  return {}

@pytest.fixture(scope='module')
def variant():
  return {
    "rid": "ca2a15a32-cf9d-4c21-a6fd-95b46fbc0123",
    "item_type": "variant",
    "date_created": "2020-02-29T00:30:42.737448+00:00",
    "last_modified": "2020-02-29T01:31:47.101386+00:00",
    "clinvarVariantTitle": "NM_002496.4(NDUFS8):c.64C>T (p.Pro22Ser)",
    "clinvarVariantId": "214835",
    "variationType": "single nucleotide variant",
    "otherNameList": [
        "p.P22S:CCT>TCT"
    ],
    "hgvsNames": {
        "others": [
            "NM_002496.4:c.64C>T",
            "NP_002487.1:p.Pro22Ser",
            "NG_017040.1:g.6675C>T"
        ],
        "GRCh38": "NC_000011.10:g.68032291C>T",
        "GRCh37": "NC_000011.9:g.67799758C>T"
    },
    "molecularConsequenceList": [
        {
            "hgvsName": "NM_002496.4:c.64C>T",
            "term": "missense variant",
            "soId": "SO:0001583"
        }
    ],
    "carId": "CA321211",
    "dbSNPIds": [
        "369602258"
    ],
    "maneTranscriptTitle": "NM_002496.4",
    "preferredTitle": "NC_000011.10:g.68032291C>T"
  }

@pytest.fixture(scope='module')
def ddb_item():
  return {
    "date_created": {
        "S": "2020-03-22T17:52:33.345798"
    },
    "item_type": {
        "S": "variant"
    },
    "hgvsNames": {
        "M": {
            "GRCh38": {
                "S": "NC_000003.12:g.184957468G>A"
            },
            "NCBI36": {
                "S": "NC_000003.10:g.186157950G>A"
            },
            "others": {
                "SS": [
                    "ENST00000287546.8:c.3130G>A",
                    "ENST00000436792.6:c.3124G>A",
                    "ENST00000446204.6:c.2854G>A",
                    "ENST00000492449.5:n.1537G>A",
                    "ENST00000625842.2:c.3130G>A",
                    "NM_001009921.2:c.3130G>A",
                    "NM_001349292.1:c.3130G>A",
                    "NM_001349293.1:c.3130G>A",
                    "NM_001349294.1:c.3130G>A",
                    "NM_001349295.1:c.3130G>A",
                    "NM_001349296.1:c.3091G>A",
                    "NM_001349297.1:c.1411G>A",
                    "NM_001349298.1:c.1330G>A",
                    "NM_015303.3:c.3124G>A",
                    "NR_146113.1:n.3535G>A",
                    "XM_005247251.3:c.3130G>A",
                    "XM_006713556.2:c.1414G>A",
                    "XM_006713556.4:c.1414G>A",
                    "XM_011512599.1:c.1537G>A",
                    "XM_011512599.2:c.1537G>A",
                    "XM_011512600.1:c.1393G>A",
                    "XM_011512600.3:c.1393G>A",
                    "XM_011512601.1:c.1330G>A",
                    "XM_024453426.1:c.3130G>A",
                    "XM_024453427.1:c.3130G>A",
                    "XM_024453428.1:c.3124G>A",
                    "XM_024453429.1:c.1411G>A",
                    "XM_024453430.1:c.1330G>A"
                ]
            },
            "GRCh37": {
                "S": "NC_000003.11:g.184675256G>A"
            }
        }
    },
    "molecularConsequenceList": {
      "L": [
        { 
          'M': {
           "hgvsName": {
              "S": "NM_000151.4:c.1039C>T"
            },
            "term": {
              "S": "nonsense"
            },
            "soId": {
              "S": "SO:0001587"
            }
          }
        },
        { 
          'M': {
            "hgvsName": {
              "S": "NM_001270397.2:c.*431C>T"
            },
            "term": {
              "S": "3 prime UTR variant"
            },
            "soId": {
              "S": "SO:0001624"
            }
          }
        }
      ]
    },
    "dbSNPIds": {
        "SS": [
            "566967979"
        ]
    },
    "PK": {
        "S": "8769b009-6897-4faa-9abf-17c1a4c64b78"
    },
    "last_modified": {
        "S": "2020-03-22T17:52:33.345798"
    },
    "carId": {
        "S": "CA2738256"
    },
    "preferredTitle": {
      "S": "NC_000003.12:g.184957468G>A (GRCh38)"
    },
    "maneTranscriptTitle": {
      "S": "NM_002496.4"
    }
}

def test_put_throws_boto_core_error():
  # Specifying a null table name should trigger a ParamValidationError
  test_client = ddb_client.Client(None, True)
 
  with pytest.raises(BotoCoreError):
    test_client.put_variant({})
    
def test_put_throws_client_error():
  test_client = ddb_client.Client('TEST_TABLE', True)

  with pytest.raises(ClientError):
    pass
