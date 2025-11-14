import os
import requests
import xml.etree.ElementTree as ET 
import src.parsers.clinvar_vcv_parser as vcv_parser


def find(vcv_id, scv_id, scv_version):
    """ Use ClinVar efetch to retrieve the XML for the specified version SCV assession in given VCV ID
        e.g. https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=clinvar&rettype=vcv&id=VCV000014206.1
    Args:
        vcv_id: VCV ID and version separated by a period, e.g.
            VCV000014206.1 or just the VCV ID
        scv_id: SCV ID
            SCV000035529 
        scv_version: SCV version
            1
    """

    # Fetch the VCV xml file
    vcv_xml = fetch(vcv_id)

    # If no xml is returned for given VCV ID, raise error
    if vcv_xml == None:
        raise ClientError(f"Problem in fetching {vcv_id}. No XML is returned.", 404)
    else:
        # Find given SCV version in xml file
        if scv_id is not None and len(scv_id) > 0 and scv_version is not None and len(scv_version) > 0:
            info = vcv_parser.from_xml(vcv_xml, scv_id, scv_version)
            # If no SVC information is found, raise error
            if info == {}:
                raise ClientError(f"Cannot find given {scv_id} version {scv_version} in {vcv_id}.", 404)
        else:
            # Can be used if need to verify VCV id (not used now)
            # If no SCV Id and/or version, just return VCV 
            info = vcv_parser.from_xml(vcv_xml, None, None)
            if info == {}:
                raise ClientError(f"Error from Clinvar parser - {vcv_id} is invalid", 500)

        return info

def fetch(vcv_id):
    """Get the VCV XML from the ClinVar website.
    ClinVar API lets you specify versions. For example:
    https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=clinvar&rettype=vcv&id=VCV000014206.1
    (Notice the .1 at the end of the URL.)
    Args:
        vcv_id: Variation ClinVar record, e.g. VCV000014206 or VCV000014206.1
    Returns:
        XML for the VCV ID as a string
    Raises:
        ClientError: if the request errors
    """

    # The requests library allows you to put your query parameters in a
    # dictionary like this rather than having to write them in the URL.
    payload = {"db": "clinvar", "rettype": "vcv", "id": vcv_id}
    url = os.environ['CLIN_VAR_EUTILS_EFETCH_ENDPOINT']

    try:
        # ClinVar's server sometimes takes a while.
        res = requests.get(url, payload, timeout=20)
        """ Check if error is returned
            possible returned error:
            <eFetchResult>
              <ERROR>ID list is empty! In it there are neither IDs nor accessions.</ERROR> 
            </eFetchResult>
        """
        if "<ERROR>" in res.text:
            error = ET.fromstring(res.text).find("./ERROR")
            errText = error.text if error is not None else "Unknown Error"
            print (f"ERROR: In ClinVar VCV client fetch {vcv_id} - <ERROR> returned in res.text")
            raise ClientError(f"Problem in fetching {vcv_id}. {errText}", 404)
            return None
        else:
            return res.text
    except requests.exceptions.Timeout as timeoutErr:
        print (f"ERROR: In ClinVar VCV client fetch {vcv_id} - exception timeout")
        raise ClientError(f"Problem in fetching {vcv_id}. {tiemoutErr}", 404)
        return None
    except requests.exceptions.RequestException as err:
        print (f"ERROR: In ClinVar VCV client fetch {vcv_id} - exception")
        raise ClientError(f"Problem in fetching {vcv_id}. {err}", 404)
        return None


class ClientError(Exception):
    """Define a custom error for failures to fetch ClinVar accession."""

    def __init__(self, message, status_code):
        self.message = message
        self.status_code = status_code
