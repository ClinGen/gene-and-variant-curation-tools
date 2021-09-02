import xml.etree.ElementTree as ET
from datetime import datetime

"""
    getAttribute -> get
    getElementsByTagName(selector)[0] -> find(.//selector)
    getElementsByTagName(selector) -> findall(.//selector)
    textContent -> text

"""

# python xml module uses xpath syntax
# https://docs.python.org/3.3/library/xml.etree.elementtree.html

# export function parseClinvarInterpretations(xml) {
def from_xml(xml):
    interpretation_summary = {}
    interpretation_SCVs = []
    
    doc_clinvar_xml = ET.fromstring(xml)
    
    # we want ClinVarResult-Set and it's the root so no need to find, just assign it
    element_clinvar_result_set = doc_clinvar_xml

    # gotcha here that xml element only evaluates to True if subelement exists
    # `is not None` is the recommended why to check existence
    # https://stackoverflow.com/questions/38725683/python-xml-element-found-but-evaluates-to-false-how-to-check-existence-pythoni
    if element_clinvar_result_set is not None:
        # Expecting one VariationArchive element per variant (and one variant at a time)
        element_variation_archive = element_clinvar_result_set.find('.//VariationArchive')

        if element_variation_archive is not None:
            # Only interested in InterpretedRecord element
            element_interpreted_record = element_variation_archive.find('.//InterpretedRecord')

            if element_interpreted_record is not None:
                attribute_IR_date_last_evaluated = attribute_number_of_submissions = element_IR_description = element_explanation = None
                ref_trait_mapping = []
                element_interpretations = element_interpreted_record.find('.//Interpretations')
                element_IR_review_status = element_interpreted_record.find('.//ReviewStatus')
                element_trait_mapping_list = element_interpreted_record.find('.//TraitMappingList')
                element_clinical_assertion_list = element_interpreted_record.find('.//ClinicalAssertionList')
                
                # Retrieve summary data from the first Interpretation element within the first Interpretations element
                if element_interpretations is not None:
                    element_IR_interpretation = element_interpretations.find('.//Interpretation')

                    if element_IR_interpretation is not None:
                        attribute_IR_date_last_evaluated = element_IR_interpretation.get('DateLastEvaluated')
                        attribute_number_of_submissions = element_IR_interpretation.get('NumberOfSubmissions');
                        element_IR_description = element_IR_interpretation.find('.//Description')

                        if element_IR_description is not None:
                            element_explanation = element_IR_interpretation.find('.//Explanation')

                # Save summary data (for display) if any one of the significant data elements (labeled fields) is present
                if element_IR_review_status is not None or element_IR_description is not None or attribute_IR_date_last_evaluated or attribute_number_of_submissions:
                    interpretation_summary = {
                        'ReviewStatus': element_IR_review_status.text if element_IR_review_status is not None else '',
                        'ClinicalSignificance': element_IR_description.text if element_IR_description is not None else '',
                        'Explanation': element_explanation.text if element_explanation is not None else '',
                        'DateLastEvaluated': attribute_IR_date_last_evaluated if attribute_IR_date_last_evaluated else '',
                        'SubmissionCount': attribute_number_of_submissions if attribute_number_of_submissions else ''
                    }

                # Fill TraitMapping reference array (with data to lookup condition names and/or MedGen IDs, when necessary)
                if element_trait_mapping_list is not None:
                    elements_trait_mappings = element_trait_mapping_list.findall('.//TraitMapping')

                    # for (let i = 0; i < elements_trait_mapping.length; i++) {
                    for elements_trait_mapping in elements_trait_mappings:
                        if elements_trait_mapping.get('TraitType') == 'Disease':
                            obj_trait_map = {
                                'ClinicalAssertionID': elements_trait_mapping.get('ClinicalAssertionID'),
                                'MappingType': elements_trait_mapping.get('MappingType'),
                                'MappingValue': elements_trait_mapping.get('MappingValue'),
                                'MappingRef': elements_trait_mapping.get('MappingRef')
                            }
                            element_med_gen = elements_trait_mapping.find('.//MedGen')

                            if element_med_gen is not None:
                                obj_trait_map['MedGenCUI'] = element_med_gen.get('CUI')
                                obj_trait_map['MedGenName'] = element_med_gen.get('Name')

                            ref_trait_mapping.append(obj_trait_map)

                # Process and save SCVs (representing interpretations submitted to ClinVar)
                if element_clinical_assertion_list is not None:
                    elements_clinical_assertions = element_clinical_assertion_list.findall('.//ClinicalAssertion')

                    for elements_clinical_assertion in elements_clinical_assertions:
                        element_clinvar_accession = elements_clinical_assertion.find('.//ClinVarAccession')

                        if element_clinvar_accession is not None and element_clinvar_accession.get('Type') == 'SCV':
                            obj_SCV = {'phenotypeList': []}
                            bool_save_SCV = False
                            attribute_accession = element_clinvar_accession.get('Accession')
                            attribute_submitter_name = element_clinvar_accession.get('SubmitterName')
                            attribute_CA_id = elements_clinical_assertion.get('ID')
                            element_CA_review_status = elements_clinical_assertion.find('.//ReviewStatus')
                            element_CA_interpretation = elements_clinical_assertion.find('.//Interpretation')
                            element_trait_set = elements_clinical_assertion.find('.//TraitSet')
                            elements_attribute_sets = elements_clinical_assertion.findall('.//AttributeSet')

                            # Save submission accession (including version)
                            if attribute_accession:
                                attribute_version = element_clinvar_accession.get('Version')

                                obj_SCV['accession'] = attribute_accession
                                bool_save_SCV = True

                                if attribute_version:
                                    obj_SCV['version'] = attribute_version

                            # Save submitter name/ID and study description
                            if attribute_submitter_name:
                                attribute_org_id = element_clinvar_accession.get('OrgID')
                                element_study_description = elements_clinical_assertion.find('.//StudyDescription')

                                obj_SCV['submitterName'] = attribute_submitter_name
                                bool_save_SCV = True

                                if attribute_org_id:
                                    obj_SCV['orgID'] = attribute_org_id

                                if element_study_description is not None:
                                    obj_SCV['studyDescription'] = element_study_description.text

                            # Save review status
                            if element_CA_review_status is not None:
                                obj_SCV['reviewStatus'] = element_CA_review_status.text
                                bool_save_SCV = True

                            # Save clinical significance and last evaluated date (from first Interpretation element)
                            if element_CA_interpretation is not None:
                                element_CA_description = element_CA_interpretation.find('.//Description')

                                if element_CA_description is not None:
                                    attribute_CA_date_last_evaluated = element_CA_interpretation.get('DateLastEvaluated')

                                    obj_SCV['clinicalSignificance'] = element_CA_description.text
                                    bool_save_SCV = True

                                    if attribute_CA_date_last_evaluated:
                                        obj_SCV['dateLastEvaluated'] = datetime.strptime(attribute_CA_date_last_evaluated, '%Y-%m-%d').strftime('%b %d, %Y')

                            # Save condition(s)
                            if element_trait_set is not None:
                                if element_trait_set.get('Type') == 'Disease':
                                    elements_traits = element_trait_set.findall('.//Trait')

                                    # for (let j = 0; j < elements_trait.length; j++) {
                                    for elements_trait in elements_traits:
                                        if elements_trait.get('Type') == 'Disease':
                                            element_element_value = attribute_type = None
                                            obj_trait = {'identifiers': []}
                                            bool_save_trait = False
                                            bool_med_gen_found = False
                                            element_name = elements_trait.find('.//Name')
                                            elements_xrefs = elements_trait.findall('.//XRef')

                                            # Save condition name from the first Name element
                                            if element_name is not None:
                                                element_element_value = element_name.find('.//ElementValue')

                                                if element_element_value is not None:
                                                    attribute_type = element_element_value.get('Type')
                                                    obj_trait['name'] = element_element_value.text
                                                    bool_save_SCV = True
                                                    bool_save_trait = True

                                            # Save condition ID(s) (and corresponding data source(s)) 
                                            for elements_xref in elements_xrefs:
                                                attribute_db = elements_xref.get('DB')
                                                attribute_id = elements_xref.get('ID')
                                                obj_xref = {
                                                    'db': attribute_db if attribute_db else None,
                                                    'id': attribute_id if attribute_id else None
                                                }

                                                obj_trait['identifiers'].append(obj_xref)
                                                bool_save_trait = True

                                                if not bool_med_gen_found and obj_xref['db'] == 'MedGen':
                                                    bool_med_gen_found = True

                                                # If not already saved, retrieve condition name from TraitMapping reference array (using saved ID and data source)
                                                if not 'name' in obj_trait or not obj_trait['name']:
                                                    obj_trait_map = list(filter(
                                                        lambda refElement:
                                                            (refElement['ClinicalAssertionID'] == attribute_CA_id) and
                                                            (refElement['MappingType'] == 'XRef') and
                                                            (refElement['MappingValue'] == obj_xref['id']) and
                                                            (refElement['MappingRef'] == obj_xref['db'])
                                                        ,
                                                        ref_trait_mapping
                                                    ))
                                                    obj_trait_map = obj_trait_map[0] if obj_trait_map else None

                                                    if obj_trait_map:
                                                        obj_trait['name'] = obj_trait_map['MedGenName']
                                                        bool_save_SCV = True
                                                        bool_save_trait = True

                                            # If not already saved, retrieve condition MedGen ID from TraitMapping reference array (using saved name)
                                            if element_element_value is not None and not bool_med_gen_found:
                                                obj_trait_map = list(filter(
                                                    lambda refElement:
                                                        (refElement['ClinicalAssertionID'] == attribute_CA_id) and
                                                        (refElement['MappingType'] == 'Name') and
                                                        (refElement['MappingValue'] == obj_trait['name']) and
                                                        (refElement['MappingRef'] == attribute_type)
                                                    ,
                                                    ref_trait_mapping
                                                ))
                                                obj_trait_map = obj_trait_map[0] if obj_trait_map else None

                                                if obj_trait_map:
                                                    obj_trait['identifiers'].append({
                                                        'db': 'MedGen',
                                                        'id': obj_trait_map['MedGenCUI'] if obj_trait_map['MedGenCUI'] else None
                                                    })
                                                    bool_save_trait = True

                                            if bool_save_trait:
                                                obj_SCV['phenotypeList'].append(obj_trait)

                            # Save assertion method and/or mode of inheritance
                            for elements_attribute_set in elements_attribute_sets:
                                element_attribute = elements_attribute_set.find('.//Attribute')

                                if element_attribute is not None:
                                    attribute_as_type = element_attribute.get('Type')

                                    # Save assertion method data (when it can be partnered with a review status)
                                    if attribute_as_type == 'AssertionMethod' and obj_SCV['reviewStatus']:
                                        element_citation = elements_attribute_set.find('Citation')

                                        obj_SCV['assertionMethod'] = element_attribute.text

                                        if element_citation is not None:
                                            element_url = element_citation.find('.//URL')

                                            # For an assertion method citation, prefer a provided URL to a PubMed ID
                                            if element_url is not None:
                                                obj_SCV['AssertionMethodCitationURL'] = element_url.text
                                            else:
                                                elements_ids = element_citation.findall('.//ID')

                                                # Save first PubMed ID
                                                k = 0
                                                while k < len(elements_ids):
                                                    if elements_ids[k].get('Source') == 'PubMed':
                                                        obj_SCV['AssertionMethodCitationPubMedID'] = elements_ids[k].text
                                                        k = len(elements_ids)
                                                        continue
                                                    k += 1

                                    # Save a mode of inheritance (when it can be partnered with a condition)
                                    elif attribute_as_type == 'ModeOfInheritance' and len(obj_SCV['phenotypeList']):
                                        obj_SCV['modeOfInheritance'] = element_attribute.text

                            # Save SCV (for display) if any one of the significant data elements (main column headers) was found
                            if bool_save_SCV:
                                interpretation_SCVs.append(obj_SCV)

    return {'clinvarInterpretationSummary': interpretation_summary, 'clinvarInterpretationSCVs': interpretation_SCVs}
