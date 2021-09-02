import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux'
import { cloneDeep, isEmpty, get as lodashGet } from "lodash";
import { useHistory, Link } from "react-router-dom";
import { Row, Col, Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBriefcase } from "@fortawesome/free-solid-svg-icons";
import { RestAPI as API } from '@aws-amplify/api-rest';
import { API_NAME } from '../../../../utils';
import { setGdmAction } from "../../../../actions/gdmActions";
import { updateAnnotationAction } from "../../../../actions/annotationActions";
import CardPanel from "../../../common/CardPanel";
import Input from "../../../common/Input";
import { LoadingButton } from "../../../common/LoadingButton";
import { COUNTRY_CODES } from '../../../../constants/countryCodes';
import { EXTERNAL_API_MAP } from '../../../../constants/externalApis';
import { ExternalLink } from "../../../common/ExternalLink";
import LoadingSpinner from '../../../common/LoadingSpinner';
import { renderLabelNote, renderLabelPhenoTerms, getGenesFromList, getPmidsFromList } from '../common/commonFunc';
import { HpoTermModal } from '../common/HpoTermModal';
import { MethodsPanel, createMethod } from '../common/Methods';
import { DeleteCurationModal } from '../common/DeleteCurationModal';
import { GroupDisease } from '../disease/GroupDisease';

import { gdmParticipantReducer } from '../../../../utilities/gdmUtilities';
import { useAmplifyAPIRequestRecycler } from '../../../../utilities/fetchUtilities';

export const GroupCuration = ({
  editGroup = null,
  ...props }) => {

  const history = useHistory();
  const dispatch = useDispatch();
  const requestRecycler = useAmplifyAPIRequestRecycler();

  const gdm = useSelector((state) => state.gdm.entity);
  const gdmIsLoading = useSelector(state => state.gdm.isLoading);
  const annotation = useSelector(state => {
    if (state.annotations.activePK && state.annotations.byPK[state.annotations.activePK]) {
      return state.annotations.byPK[state.annotations.activePK];
    }
  })
  const annotationIsLoading = useSelector(state => state.annotations.isLoading);

  const auth = useSelector((state) => state.auth);

  const [ group, setGroup ] = useState(editGroup); // If we're editing a group, this gets the fleshed-out group object we're editing
  const [ genotyping2Disabled, setGenotyping2Disabled ] = useState(true); // True if genotyping method 2 dropdown disabled
  const [ diseaseObj, setDiseaseObj ] = useState({});
  const [ diseaseError, setDiseaseError ] = useState(null);
  const [ diseaseRequired, setDiseaseRequired ] = useState(false);
  const [ hpoWithTerms, setHpoWithTerms ] = useState([]);
  const [ hpoElimWithTerms, setHpoElimWithTerms ] = useState([]);
  const [ formData, setFormData ] = useState({});
  const [ formErrors, setFormErrors ] = useState({});
  const [ badGenes, setBadGenes ] = useState([]);
  const [ badPmids, setBadPmids ] = useState([]);
  const [ isSubmitting, setIsSubmitting ] = useState(false);
  const [ submitError, setSubmitError ] = useState(null);

  useEffect(() => {
    setGroup(editGroup);
    loadGroupData();
  }, []);

  const loadGroupData = () => {
    // If editing get group data from database
    let data = {};
    data["groupname"] = group && group.label ? group.label : '';
    data["phenoterms"] = group && group.termsInDiagnosis ? group.termsInDiagnosis : '';
    data["notphenoterms"] = group && group.termsInElimination ? group.termsInElimination : '';
    data["malecount"] = group && group.numberOfMale ? group.numberOfMale : '';
    data["femalecount"] = group && group.numberOfFemale ? group.numberOfFemale : '';
    data["agefrom"] = group && group.ageRangeFrom ? group.ageRangeFrom : '';
    data["ageto"] = group && group.ageRangeTo ? group.ageRangeTo : '';
    data["indcount"] = group && group.totalNumberIndividuals ? group.totalNumberIndividuals : ''
    data["indfamilycount"] = group && group.numberOfIndividualsWithFamilyInformation ? group.numberOfIndividualsWithFamilyInformation : '';
    data["notindfamilycount"] = group && group.numberOfIndividualsWithoutFamilyInformation ? group.numberOfIndividualsWithoutFamilyInformation : '';
    data["indvariantgenecount"] = group && group.numberOfIndividualsWithVariantInCuratedGene ? group.numberOfIndividualsWithVariantInCuratedGene : '';
    data["notindvariantgenecount"] = group && group.numberOfIndividualsWithoutVariantInCuratedGene ? group.numberOfIndividualsWithoutVariantInCuratedGene : '';
    data["indvariantothercount"] = group && group.numberOfIndividualsWithVariantInOtherGene ? group.numberOfIndividualsWithVariantInOtherGene : '';
    data["othergenevariants"] = group && group.otherGenes ? group.otherGenes.map((gene) => { return gene; }).join(', ') : '';
    data["additionalinfogroup"] = group && group.additionalInformation ? group.additionalInformation : '';
    data["otherpmids"] = group && group.otherPMIDs ? group.otherPMIDs.map((article) => { return article; }).join(', ') : '';
    data["country"] = group && group.countryOfOrigin ? group.countryOfOrigin : 'none';
    data["ethnicity"] = group && group.ethnicity ? group.ethnicity : 'none';
    data["race"] = group && group.race ? group.race : 'none';
    data["agerangetype"] = group && group.ageRangeType ? group.ageRangeType : 'none';
    data["ageunit"] = group && group.ageRangeUnit ? group.ageRangeUnit : 'none';

    // methods data
    data["prevtesting"] = group && group.method && group.method.previousTesting === true
      ? "Yes"
      : (group && group.method && group.method.previousTesting === false ? "No" : "none");
    data["prevtestingdesc"] = group && group.method && group.method.previousTestingDescription ? group.method.previousTestingDescription : '';
    data["genomewide"] = group && group.method && group.method.genomeWideStudy === true
      ? "Yes"
      : (group && group.method && group.method.genomeWideStudy === false ? "No" : "none");
    data["genotypingmethod1"] = group && group.method && group.method.genotypingMethods && group.method.genotypingMethods[0] ? group.method.genotypingMethods[0] : "none";
    setGenotyping2Disabled(data["genotypingmethod1"] === "none" ? true : false);
    data["genotypingmethod2"] = group && group.method && group.method.genotypingMethods && group.method.genotypingMethods[1] ? group.method.genotypingMethods[1] : "none";
    data["specificmutation"] = group && group.method && group.method.specificMutationsGenotypedMethod ? group.method.specificMutationsGenotypedMethod : ''
    setFormData(data);
   
    if (group && group.commonDiagnosis && group.commonDiagnosis.length > 0) {
      setDiseaseObj(group.commonDiagnosis[0])
    }
    if (group && group.hpoIdInDiagnosis) {
      setHpoWithTerms(group.hpoIdInDiagnosis);
    }
    if (group && group.hpoIdInElimination) {
      setHpoElimWithTerms(group.hpoIdInElimination);
    }
  };

  const clearFieldError = (fieldName) => {
    if (formErrors[fieldName]) {
      const errors = Object.keys(formErrors).reduce((obj, key) => {
        if (key !== fieldName) {
          obj[key] = formErrors[key]
        }
        return obj;
      }, {})
      setFormErrors(errors);
    }
  };

  // Handle value changes in genotyping method 1
  const handleChange = (e) => {
    if (e.target.name === "othergenevariants") {
      setBadGenes([]);
    }
    if (e.target.name === "otherpmids") {
      setBadPmids([]);
    }

    let newData = cloneDeep(formData);
    newData[e.target.name] = e.target.name === "othergenevariants" ? e.target.value.toUpperCase() : e.target.value;

    // Disable the Genotyping Method 2 if Genotyping Method 1 has no value
    if (e.target.name === 'genotypingmethod1') {
      setGenotyping2Disabled(e.target.value === "none" ? true : false);
      if (e.target.value === "none") {
        newData['genotypingmethod2'] = "none";
      }
    }

    if (e.target.name === 'phenoterms' && e.target.value !== "") {
      setDiseaseError(null);
      setDiseaseRequired(false);
    }

    clearFieldError(e.target.name);
    setFormData(newData);

  };

  const updateHpo = (hpoTerms) => {
    if (hpoTerms) {
      setHpoWithTerms(hpoTerms);
      setDiseaseRequired(false);
      setDiseaseError(null);
      clearFieldError("diseaseError");
      clearFieldError("phenoterms");
    }
  };

  const updateElimHpo = (hpoTerms) => {
    if (hpoTerms) {
      setHpoElimWithTerms(hpoTerms);
    }
  };

  const handleCancel = () => {
    // define where pressing the Cancel button should take you to
    // If created new group, go to /group-submit, else back to /curation-central
    let cancelUrl = "/dashboard";
    if (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null)) {
      cancelUrl = `/curation-central/${gdm.PK}/annotation/${annotation.PK}`;
    }
    requestRecycler.cancelAll();
    history.push(cancelUrl);
  };

  const handleSubmitError = (msg, error) => {
    let errorDetailMessage;

    // default get detail error reason from amplify's API request
    // https://stackoverflow.com/a/49778338/9814131
    const serverDetailMessage = lodashGet(error, "response.data.error");

    if (serverDetailMessage) {
      errorDetailMessage = serverDetailMessage;
    }
    else if (error instanceof Error) {
      errorDetailMessage = error.message;
    } else if (typeof error === "string") {
      errorDetailMessage = error;
    } else {
      errorDetailMessage = JSON.stringify(error);
    }
    
    setSubmitError(
      `Something went wrong whlie trying to save this evidence! Detail: ${msg} - ${errorDetailMessage}`
    );
    setIsSubmitting(false);
  };

  const renderGenesError = () => {
    if (formErrors["othergenevariants"]) {
      return (
        <>
        {formErrors["othergenevariants"]}
        </>
      );
    } else if (badGenes.length > 0) {
      return (
        <span>{badGenes.join(', ')} not found</span>
      );
    } else {
      return null;
    }
  };

  const validateGenes = () => {
    let valid = true;
    const geneSymbols = getGenesFromList(formData["othergenevariants"]);
    // At least one gene symbol entered; search the DB for them.
    return new Promise((resolve, reject) => {
      if (geneSymbols && geneSymbols.length) {
        let i = 0;
        geneSymbols.forEach(symbol => {
          requestRecycler.capture(API.get(API_NAME, '/genes/' + symbol))
          .then(result => {
            i++;
            if (i === geneSymbols.length) {
              if (valid) {
                resolve(valid);
              } else {
                reject(valid);
              }
            }
          }).catch(err => {
            setBadGenes(badGenes => [...badGenes, symbol]);
            valid = false;
            i++;
            if (i === geneSymbols.length) {
              reject(valid);
            }
          });
        })
      } else {
        resolve(valid);
      }
    });
  };

  const renderPmidsError = () => {
    if (formErrors["otherpmids"]) {
      return (
        <>
        {formErrors["otherpmids"]}
        </>
      );
    } else if (badPmids.length > 0) {
      return (
        <>
        <span>{badPmids.join(', ')} not found</span>
        </>
      );
    } else {
      return null;
    }
  };

  const saveArticle = async (article) => {
    // POST the article to get the pk
    const createArticleRequest = API.post(API_NAME, `/articles/`, {
      body: { article },
    });
    try {
      article = await requestRecycler.capture(createArticleRequest);
    } catch (error) {
      if (!API.isCancel(error)) {
        handleSubmitError("Failed to save article to database", error);
        console.error("Failed to save article to database", error);
      }
    }
  };

  const validatePmids = () => {
    let valid = true;
    const pmids = getPmidsFromList(formData["otherpmids"]);
    // At least one pmid entered; search the DB for them.
    return new Promise((resolve, reject) => {
      if (pmids && pmids.length) {
        let i = 0;
        pmids.forEach(pmid => {
          requestRecycler.capture(API.get(API_NAME, '/articles/' + pmid))
          .then(article => {
            i++;
            if (!article.PK) {
              saveArticle(article);
            }
            if (i === pmids.length) {
              if (valid) {
                resolve(valid);
              } else {
                reject(valid);
              }
            }
          }).catch(err => {
            i++;
            setBadPmids(badPmids => [...badPmids, pmid]);
            valid = false;
            if (i === pmids.length) {
              reject(valid);
            }
          });
        })
      } else {
        resolve(valid);
      }
    });
  };

  const validateFormFields = () => {
    const errors = {};

    // Check all required fields have value
    // Check group name has value
    if (formData["groupname"] === '') {
      errors["groupname"] = "A Group name is required";
    }
    // Check Total number individuals in group has value
    if (formData["indcount"] === '') {
      errors["indcount"] = "A number is required";
    }

    // Validate HPO ids in phenotype free text have proper format
    // Validate if either disease and/or HPO Id(s) and/or Phenotype free text is entered
    let has_disease = true;
    if (!diseaseObj || (diseaseObj && !diseaseObj['term'])) {
      has_disease = false;
    }
    if (!has_disease && formData["phenoterms"] === '' && hpoWithTerms.length < 1) {
      setDiseaseRequired(true);
      setDiseaseError("Enter disease term and/or HPO Id(s) and/or Phenotype free text disease.");
      errors["diseaseError"] = "Enter disease term and/or HPO Id(s) and/or Phenotype free text disease.";
      errors["phenoterms"] = "Enter disease term and/or HPO Id(s) and/or Phenotype free text phenoterms.";
    }

    // Validate HPO ids in NOT Phenotype free text have proper format  
    // Validate gene symbols have the proper format (will check for existence later)
    const geneSymbols = getGenesFromList(formData["othergenevariants"]);
    if (geneSymbols && geneSymbols.length && geneSymbols.includes(null)) {
      // Gene symbol list is bad
      errors["othergenevariants"] = "Use gene symbols (e.g. SMAD3) separated by commas";
    }

    // Validate pmids have the proper format (will check for existence later)
    const pmids = getPmidsFromList(formData["otherpmids"]);
    if (pmids && pmids.length && pmids.includes(null)) {
      // PMID list is bad
      errors["otherpmids"] = "Use PubMed IDs (e.g. 12345678) separated by commas";
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return false;
    } else {
      return true;
    }
  };

  const createNewGroupData = async () => {
    // If editing a group, copy over old family data
    let newGroup = group ? cloneDeep(group) : {};

    // Set group label
    newGroup.label = formData["groupname"];
    // Set the Group disease
    newGroup.commonDiagnosis = (diseaseObj && !isEmpty(diseaseObj)) ? [diseaseObj] : null;
    // If a method object was created (at least one method field set), get its new object's
    const newMethod = createMethod(formData);
    newGroup.method = (newMethod && !isEmpty(newMethod)) ? newMethod : {};

    // Fill in the group fields from the Common Diseases & Phenotypes panel
    newGroup.hpoIdInDiagnosis = (hpoWithTerms && hpoWithTerms.length) ? hpoWithTerms : null;
    newGroup.termsInDiagnosis = formData["phenoterms"] ? formData["phenoterms"] : null;
    newGroup.hpoIdInElimination = (hpoElimWithTerms && hpoElimWithTerms.length) ?  hpoElimWithTerms : null;
    newGroup.termsInElimination = formData["notphenoterms"] ? formData["notphenoterms"] : null;
    
    // Fill in the group fields from the Group Demographics panel
    newGroup.numberOfMale = formData["malecount"] ? parseInt(formData["malecount"], 10) : null;
    newGroup.numberOfFemale = formData["femalecount"] ? parseInt(formData["femalecount"], 10) : null;
    newGroup.countryOfOrigin = formData["country"] !== 'none' ? formData["country"] : null;
    newGroup.ethnicity = formData["ethnicity"] !== 'none' ? formData["ethnicity"] : null;
    newGroup.race = formData["race"] !== 'none' ? formData["race"] : null;
    newGroup.ageRangeType = formData["agerangetype"] !== 'none' ? formData["agerangetype"] : null;
    newGroup.ageRangeFrom = formData["agefrom"] ?  parseInt(formData["agefrom"], 10) : null;
    newGroup.ageRangeTo = formData["ageto"] ?  parseInt(formData["ageto"], 10) : null;
    newGroup.ageRangeUnit = formData["ageunit"] !== 'none' ? formData["ageunit"] : null;

    // Fill in the group fields from Group Information panel
    newGroup.totalNumberIndividuals = formData["indcount"] ?  parseInt(formData["indcount"], 10) : null;
    newGroup.numberOfIndividualsWithFamilyInformation = formData["indfamilycount"] ?  parseInt(formData["indfamilycount"], 10) : null;
    newGroup.numberOfIndividualsWithoutFamilyInformation = formData["notindfamilycount"] ?  parseInt(formData["notindfamilycount"], 10) : null;
    newGroup.numberOfIndividualsWithVariantInCuratedGene = formData["indvariantgenecount"] ? parseInt(formData["indvariantgenecount"], 10) : null;
    newGroup.numberOfIndividualsWithoutVariantInCuratedGene = formData["notindvariantgenecount"] ?  parseInt(formData["notindvariantgenecount"], 10) : null;
    newGroup.numberOfIndividualsWithVariantInOtherGene = formData["indvariantothercount"] ? parseInt(formData["indvariantothercount"], 10) : null;
    // Add array of 'Other genes found to have variants in them'
    if (formData["othergenevariants"]) {
      const genes = getGenesFromList(formData["othergenevariants"]);
      newGroup.otherGenes = genes.map(gene => { return gene; });
    } else {
      newGroup['otherGenes'] = null;
    }
    // Add array of other PMIDs
    if (formData["otherpmids"]) {
      const pmids = getPmidsFromList(formData["otherpmids"]);
      newGroup.otherPMIDs = pmids.map(pmid => { return pmid; });
    } else {
      newGroup['otherPMIDs'] = null;
    }
    newGroup.additionalInformation = formData["additionalinfogroup"] ? formData["additionalinfogroup"] : null;

    // If adding new group, add affiliation if the user is associated with an affiliation
    // and if the data object has no affiliation
    if (!newGroup.PK) {
      if (!newGroup.affiliation) {
        if (lodashGet(auth, "currentAffiliation.affiliation_id", null)) {
          newGroup.affiliation = auth.currentAffiliation.affiliation_id;
        }
      }
      newGroup.submitted_by = lodashGet(auth, "PK", null);
    }
    newGroup.modified_by = lodashGet(auth, "PK", null);
    newGroup.item_type = "group";

    // Added for SOP8
    newGroup.associatedParent = annotation.PK;

    return newGroup;
  };

  const saveGroup = async (newGroup) => {
    let groupResult;
    const isNew = newGroup.PK ? false : true;
    const postOrPutRequestArgs = [
      API_NAME,
      isNew
      ? "/groups"
      : `/groups/${newGroup.PK}`,
      { body: { newGroup } }
    ];
    try {
      groupResult = await (isNew
      ? requestRecycler.capture(API.post(...postOrPutRequestArgs))
      : requestRecycler.capture(API.put(...postOrPutRequestArgs)));
    } catch (error) {
      if (API.isCancel(error)) {
        return;
      }
      throw new Error(
        "Failed to update or create new group"
      );
    }

    if (!groupResult || !groupResult.PK) {
      console.log("no groupResult");
      throw new Error("Empty response from server when saving group");
    } else {
      console.log(groupResult.PK);
    }

    // Add group to annonation if new group
    let annotationResult = null;
    if (isNew) {
      const updateAnnotation = {
        ...annotation,
        groups: [...(annotation.groups || []), groupResult.PK], 
        modified_by: lodashGet(auth, "PK", null),
      };

      // PUT annotation
      try {
        annotationResult = await requestRecycler.capture(
          API.put(API_NAME, `/annotations/${annotation.PK}`, { body: { updateAnnotation } })
        );
      } catch (error) {
        throw new Error(
          "Failed to append group to annotation"
        );
      }
      if (!annotationResult ||
        !Array.isArray(annotationResult.groups) ||
        annotationResult.groups.length !== updateAnnotation.groups.length) {
        throw new Error("Empty response from server when updating annotation");
      } else {
        // update redux for annotations
        dispatch(updateAnnotationAction(annotationResult));
      }
    }
    // Edit existing group so no need to PUT annotation,
    // but need to sync redux annotation, which embeds group objects
    else {
      dispatch(updateAnnotationAction({
        ...annotation,
        // replace the updated group in the groups list
        groups: annotation.groups.map((group) => {
          if (group.PK === groupResult.PK) {
            return groupResult;
          }
          return group
        })
      }))
    }

    // add contributor to gdm if needed
    if (lodashGet(auth, "PK", null)) {
      let gdmResult = null;
      const updateGdm = {
        ...gdm,
        ...gdmParticipantReducer(gdm, auth)
      };
      // PUT gdm
      try {
        gdmResult = await requestRecycler.capture(
          API.put(API_NAME, `/gdms/${gdm.PK}`, { body: { updateGdm } })
        );
      } catch (error) {
        throw new Error(
          "Failed to append contributor to GDM"
        );
      }
      if (!gdmResult) {
        throw new Error("Empty response from server when updating contributors in gdm");
      } else {
        // update redux for gdm
        dispatch(setGdmAction(gdmResult));
      }
    }

    return (groupResult);
  };

  const submitForm = async (e) => {
    e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
    setSubmitError(null);
    setIsSubmitting(true);

    if (!badGenes.length && !badPmids.length && validateFormFields()) {
      // validate genes list
      validateGenes().then(res1 => {
        // validate pmids list
        validatePmids()
        .then(res2 => {
          createNewGroupData()
          .then(newGroup => {
            saveGroup(newGroup)
            .then(savedGroup => {
              // Save all form values from the DOM.
              // Navigate to Curation Central or Family Submit page, depending on previous page
              // ??? if (this.queryValues.editShortcut) {
              const redirectUrl = (editGroup && editGroup.PK)
                ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}`
                : (savedGroup && savedGroup.PK
                  ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}/group-curation/${savedGroup.PK}/submit`
                  : `/curation-central/${gdm.PK}/annotation/${annotation.PK}`);
              setIsSubmitting(false);
              history.push(redirectUrl);
            }).catch(error => {
              if (API.isCancel(error)) {
                //throw error;
                console.log("Cancel");
                setIsSubmitting(false);
              }
              //throw new Error
                handleSubmitError("Error in adding new group", error);
            });
          }).catch(error => {
            if (API.isCancel(error)) {
              //throw error;
              console.log("Cancel");
              setIsSubmitting(false);
            }
            //throw new Error
              handleSubmitError("Error in creating new group object", error);
          });
        }).catch(err => {
          console.log('validatePmids : %o', err);
          setIsSubmitting(false);
        });
      }).catch(err => {
        console.log('validateGenes : %o', err);
        setIsSubmitting(false);
      });
    } else {
      setIsSubmitting(false);
    }
  };

  /**
   * Update the 'diseaseObj' state used to save data upon form submission
   */
  const updateDiseaseObj = (newDisease) => {
    setDiseaseObj(newDisease);
    setDiseaseRequired(false);
    clearFieldError("diseaseError");
    clearFieldError("phenoterms");
  };

  /**
   * Clear error msg on missing disease
   */
  const clearErrorInParent = () => {
     setDiseaseError(null);
  };

  // Group Name group curation panel. Call with .call(this) to run in the same context
  // as the calling component.
  const renderGroupName = () => {
    return (
      <>
      <Input type="text" name="groupname" required maxLength="60" groupClassName="row mb-3"
        value={formData["groupname"]} onChange={handleChange} error={formErrors["groupname"] || null} 
        label="Group Label:" labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"  
      />
      <Col sm={{ span: 7, offset: 5 }}>
          <p className="mt-3">{renderLabelNote('Group')}</p>
      </Col>
      </>
    );
  };

  // Common diseases group curation panel. Call with .call(this) to run in the same context
  // as the calling component.
  const renderGroupCommonDiseases = () => {
    return (
      <>
      <Col sm={{ span: 7, offset: 5 }}>
        <p className="alert alert-warning">Please enter a disease term and/or phenotype(s); phenotypes may be entered using HPO ID(s) (preferred)
            or free text when there is no appropriate HPO ID.</p>
      </Col>
      <GroupDisease gdm={gdm} group={group} updateDiseaseObj={updateDiseaseObj} diseaseObj={diseaseObj}
        error={diseaseError} clearErrorInParent={clearErrorInParent} required={diseaseRequired} />
      <Row className="mb-3">
        <Col sm="5" className="control-label">
          <span>
            <label>Phenotype(s) in Common&nbsp;</label>
            <span className="normal">(<ExternalLink href={`${EXTERNAL_API_MAP['HPOBrowser']}`} title="Open HPO Browser in a new tab">HPO</ExternalLink> ID(s))</span>:
          </span>
        </Col>
        <Col sm="7" className="form-group hpo-term-container">
          {hpoWithTerms.length ?
            <ul>
              {hpoWithTerms.map((term, i) => {
                return (
                  <li key={i}>{term}</li>
                );
              })}
            </ul>
          : null}
          <HpoTermModal
            isNew={hpoWithTerms && hpoWithTerms.length ? false : true}
            passHpoToParent={updateHpo}
            savedHpo={hpoWithTerms}
          />
        </Col>
      </Row>
      <Input type="textarea" name="phenoterms" groupClassName="row mb-3" rows="2"
        value={formData["phenoterms"]} onChange={handleChange} error={formErrors["phenoterms"] || null}
        label={renderLabelPhenoTerms(false)} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
      />
      <Col sm={{ span: 7, offset: 5 }}>
        <p>Enter <em>phenotypes that are NOT present in Group</em> if they are specifically noted in the paper.</p>
      </Col>
      <Row className="mb-3">
        <Col sm="5" className="control-label">
          <span>
            <label className="">NOT Phenotype(s)&nbsp;</label>
            <span className="normal">(<ExternalLink href={`${EXTERNAL_API_MAP['HPOBrowser']}`} title="Open HPO Browser in a new tab">HPO</ExternalLink> ID(s))</span>:
          </span>
        </Col>
        <Col sm="7" className="form-group hpo-term-container">
          {hpoElimWithTerms.length ?
            <ul>
              {hpoElimWithTerms.map((term, i) => {
                return (
                  <li key={i}>{term}</li>
                );
              })}
            </ul>
            : null}
          <HpoTermModal
            isNew={hpoElimWithTerms && hpoElimWithTerms.length ? false : true}
            passHpoToParent={updateElimHpo}
            savedHpo={hpoElimWithTerms}
          />
        </Col> 
      </Row>
      <Input type="textarea" name="notphenoterms" groupClassName="row mb-3" rows="2"
        value={formData["notphenoterms"]} onChange={handleChange} error={formErrors["notphenoterms"] || null}
        label={renderLabelPhenoTerms(true)} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
      />
      </>
    );
  };

  // Demographics group curation panel. Call with .call(this) to run in the same context
  // as the calling component.
  const renderGroupDemographics = () => {
    return (
      <>
      <Input type="number" name="malecount" groupClassName="row mb-3"
        value={formData["malecount"]} onChange={handleChange} error={formErrors["malecount"] || null}
        label="# males:" labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
      />
      <Input type="number" name="femalecount" groupClassName="row mb-3"
        value={formData["femalecount"]} onChange={handleChange} error={formErrors["femalecount"] || null}
        label="# females:" labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
      /> 
      <Input type="select" name="country" label="Country of Origin:" groupClassName="row mb-3"
        value={formData['country']} onChange={handleChange}
        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
      >
        <option value="none">No Selection</option>
        <option disabled="disabled"></option>
        {COUNTRY_CODES.map((countryCode) => {
          return <option key={countryCode.code} value={countryCode.name}>{countryCode.name}</option>;
        })}
      </Input>
      <Input type="select" name="ethnicity" label="Ethnicity:" groupClassName="row mb-3"
        value={formData['ethnicity']} onChange={handleChange}
        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
      >
        <option value="none">No Selection</option>
        <option disabled="disabled"></option>
        <option value="Hispanic or Latino">Hispanic or Latino</option>
        <option value="Not Hispanic or Latino">Not Hispanic or Latino</option>
        <option value="Unknown">Unknown</option>
      </Input>
      <Input type="select" name="race" label="Race:" groupClassName="row mb-3"
        value={formData['race']} onChange={handleChange}
        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
      >
        <option value="none">No Selection</option>
        <option disabled="disabled"></option>
        <option value="American Indian or Alaska Native">American Indian or Alaska Native</option>
        <option value="Asian">Asian</option>
        <option value="Black">Black</option>
        <option value="Native Hawaiian or Other Pacific Islander">Native Hawaiian or Other Pacific Islander</option>
        <option value="White">White</option>
        <option value="Mixed">Mixed</option>
        <option value="Unknown">Unknown</option>
      </Input>
      <div className="form-group">
        <Row className="mb-3">
          <Col sm={{ span: 7, offset: 5 }}>
            <h4>Age Range</h4>
          </Col>
        </Row>
        <Input type="select" name="agerangetype" label="Type:" groupClassName="row mb-3"
          value={formData['agerangetype']} onChange={handleChange}
          labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
        >
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          <option value="Onset">Onset</option>
          <option value="Report">Report</option>
          <option value="Diagnosis">Diagnosis</option>
          <option value="Death">Death</option>
        </Input>
        <Row className="mb-3">
          <Col sm="5" className="control-label">
            <label>Value:</label>
          </Col>
          <Col sm="7">
            <div className="group-age-input">
              <Input type="number" name="agefrom" className="form-control"
                value={formData["agefrom"]} min={0}
                onChange={handleChange} error={formErrors["agefrom"] || null}
              />
            </div>
            <span className="group-age-inter">to</span>
            <div className="group-age-input">
              <Input type="number" name="ageto" className="form-control"
                value={formData["ageto"]} min={0}
                onChange={handleChange} error={formErrors["ageto"] || null}
              />
            </div>
          </Col>
        </Row>
        <Input type="select" name="ageunit" label="Unit:" groupClassName="row mb-3"
          value={formData['ageunit']} onChange={handleChange}
          labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
        >
          <option value="none">No Selection</option>
          <option disabled="disabled"></option>
          <option value="Hours">Hours</option>
          <option value="Days">Days</option>
          <option value="Weeks">Weeks</option>
          <option value="Weeks gestation">Weeks gestation</option>
          <option value="Months">Months</option>
          <option value="Years">Years</option>
        </Input>
      </div>
      </>
    );
  };

  // Group information group curation panel.
  const renderGroupProbandInfo = () => {
    return(
      <>
      <Input type="number" name="indcount" required groupClassName="row mb-3"
        value={formData["indcount"]} onChange={handleChange} error={formErrors["indcount"] || null}
        label="Total number individuals in group:" labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6"
      /> 
      <Input type="number" name="indfamilycount" groupClassName="row mb-3"
        value={formData["indfamilycount"]} onChange={handleChange} error={formErrors["indfamilycount"] || null}
        label="# individuals with family information:" labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6"
      /> 
      <Input type="number" name="notindfamilycount" groupClassName="row mb-3"
        value={formData["notindfamilycount"]} onChange={handleChange} error={formErrors["notindfamilycount"] || null}
        label="# individuals WITHOUT family information:" labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6"
      /> 
      <Input type="number" name="indvariantgenecount" groupClassName="row mb-3"
        value={formData["indvariantgenecount"]} onChange={handleChange} error={formErrors["indvariantgenecount"] || null}
        label="# individuals with variant in gene being curated:" labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6"
      /> 
      <Input type="number" name="notindvariantgenecount" groupClassName="row mb-3"
        value={formData["notindvariantgenecount"]} onChange={handleChange} error={formErrors["notindvariantgenecount"] || null}
        label="# individuals without variant in gene being curated:" labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6"
      /> 
      <Input type="number" name="indvariantothercount" groupClassName="row mb-3"
        value={formData["indvariantothercount"]} onChange={handleChange} error={formErrors["indvariantothercount"] || null}
        label="# individuals with variant found in other gene:" labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6"
      /> 
      <Input type="text" name="othergenevariants" groupClassName="row mb-3"
        value={formData["othergenevariants"]} onChange={handleChange} error={renderGenesError()}
        label={renderLabelOtherGenes()} labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6"
      /> 
      </>
    );
  };

  // HTML labels for inputs follow.
  const renderLabelOtherGenes = () => {
    return (
      <span>Other genes found to have variants in them (<ExternalLink href={EXTERNAL_API_MAP['HGNCHome']} title="HGNC home page in a new tab">HGNC</ExternalLink> symbol):</span>
    );
  };

  const renderMethods = () => {
    return (
      <MethodsPanel
        formData={formData}
        genotyping2Disabled={genotyping2Disabled}
        handleChange={handleChange}
        method={group && group.method ? group.method : null}
        evidenceType="group"
      />
    ); 
  };

  // Additional Information group curation panel. Call with .call(this) to run in the same context
  // as the calling component.
  const renderGroupAdditional = () => {
    return (
      <>
      <Input type="textarea" name="additionalinfogroup" groupClassName="row mb-3" rows="5"
        value={formData["additionalinfogroup"]} onChange={handleChange} error={formErrors["additionalinfogroup"] || null}
        label="Additional Information about Group:" labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
      /> 
      <Input type="textarea" name="otherpmids" groupClassName="row mb-3" rows="5"
        value={formData["otherpmids"]} placeholder="e.g. 12089445, 21217753"
        onChange={handleChange} error={renderPmidsError()}
        label="Enter PMID(s) that report evidence about this same Group:" labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
      /> 
      <Col sm={{ span: 7, offset: 5 }}>
        <p className="alert alert-info">
          Note: Any variants associated with probands that will be counted towards the Classification are not
          captured at the Group level - variants and their association with probands are required to be captured
          at the Family or Individual level. Once you submit the Group information, you will be prompted to enter
          Family/Individual information.
        </p>
      </Col>
      </>
    );
  };

  const submitErrClass = 'submit-err float-right ' + (!isEmpty(formErrors) || badGenes.length > 0 || badPmids.length > 0 ? '' : ' hidden');
  const curationLink = (lodashGet(gdm, "PK", null) && lodashGet(annotation, "PK", null))
    ? `/curation-central/${gdm.PK}/annotation/${annotation.PK}`
    : (lodashGet(gdm, "PK", null))
      ? `/curation-central/${gdm.PK}`
      : null;

  return (gdmIsLoading || annotationIsLoading) ? (
    <LoadingSpinner className="mt-4" />
  ) : (
    <div>
      <div className="viewer-titles">
        <h1>{(group ? 'Edit' : 'Curate') + ' Group Information'}</h1>
        <h2>
          { curationLink ? <Link to={curationLink}><FontAwesomeIcon icon={faBriefcase}/></Link> : null }
          <span> &#x2F;&#x2F; {formData && formData['groupname'] ? <span>Group {formData['groupname']}</span> : <span className="no-entry">No entry</span>}</span>
        </h2>
      </div>
      <Row className="group-curation-content">
        <Col sm="12">
          <form onSubmit={submitForm} className="form-horizontal mt-5">
            <CardPanel>
              {renderGroupName()}
            </CardPanel>
            <CardPanel title="Group — Common Disease(s) & Phenotype(s)" open>
              {renderGroupCommonDiseases()}
            </CardPanel>
            <CardPanel title="Group — Demographics" open>
              {renderGroupDemographics()}
            </CardPanel>
            <CardPanel title="Group — Information" open>
              {renderGroupProbandInfo()}
            </CardPanel>
            <CardPanel title="Group — Methods" open>
              {renderMethods()}
            </CardPanel>
            <CardPanel title="Group — Additional Information" open>
              {renderGroupAdditional()}
            </CardPanel>
            <Row>
              <Col>
                <LoadingButton
                  type="submit"
                  className="align-self-end mb-2 ml-2 float-right "
                  variant="primary"
                  text="Save"
                  textWhenLoading="Submitting"
                  isLoading={isSubmitting}
                />
                {gdm ?
                  <Button variant="secondary" className="float-right align-self-end mb-2 ml-2" onClick={() => handleCancel()} disabled={isSubmitting}>Cancel</Button>
                : null}
                {group ?
                  <DeleteCurationModal
                    gdm={gdm}
                    parent={annotation}
                    item={group}
                    disabled={isSubmitting}
                  />
                : null}
                <div className={submitErrClass}>Please fix errors on the form and resubmit.</div>
                <div className="submit-error float-right">{submitError ? submitError : null}</div>
              </Col>
            </Row>
          </form>
        </Col>
      </Row>
    </div>
  );
};

