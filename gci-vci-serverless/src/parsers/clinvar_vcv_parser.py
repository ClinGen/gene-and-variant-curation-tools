import xml.etree.ElementTree as ET

def from_xml(xml, scv_id=None, scv_version=None):
    """ Parses a ClinVar VCV XML response and returns a dict containing the info of given SCV version from the VCV XML.
    The info associated with the SCV from the XML are:
        - Submitter name
        - Submission date
        - ClinVar Variation ID
        - ClinVar Variation name
        - Comment
    Args:
        xml: VCV XML gotten from ClinVar
        scv_id: submitted record in ClinVar, e.g. SCV000035529
        scv_version: submitted record version
    Returns:
        info for the given VCV and SCV
    """

    info = {}
    root = ET.fromstring(xml)

    variation_archive = root.find("./VariationArchive")
    clinical_assertion_list = root.find(
        "./VariationArchive/ClassifiedRecord/ClinicalAssertionList"
    )

    # Used if need to verify a VCV Id is valid
    # If no SCV Id, return limited VCV data
    if scv_id == None:
        # If no VariationArchive is found in VCV xml, just return empty
        if variation_archive == None:
            print("No VariationArchive data is found in VCV file.")
        else:
            # Return limited data 
            info["variationId"] = variation_archive.get("VariationID")
            info["variationName"] = variation_archive.get("VariationName")
    else:
        # If VariationArchive data is found in file, fetch info
        if variation_archive is not None and clinical_assertion_list is not None:
            # Find the SCV with given SCV Id and version in given VCV xml and return data
            for clinical_assertion in clinical_assertion_list:
                clinvar_accession_el = clinical_assertion.find("./ClinVarAccession")
                clinvar_accession_scv = clinvar_accession_el.get("Accession")
                # If SCV Id is found
                if clinvar_accession_scv == scv_id:
                    # Match the SCV version
                    if clinvar_accession_el.get("Version") == scv_version:
                        clinvar_accession_comment = clinical_assertion.find("./Classification/Comment")
                        # Collect the info
                        info["submitter"] = clinvar_accession_el.get("SubmitterName")
                        info["date"] = clinvar_accession_el.get(
                            "DateUpdated"
                            ) or clinvar_accession_el.get("DateCreated")
                        info["variationId"] = variation_archive.get("VariationID")
                        info["variationName"] = variation_archive.get("VariationName")
                        info["comment"] = clinvar_accession_comment.text if clinvar_accession_comment is not None else ""
        else:
            print("No VariationArchive or clinical_assertion_list data is found in VCV file.")

    # Found VCV or SCV data is returned if found else {} is returned
    return info
