import React, { useState, useEffect } from "react";
import { Link, useHistory } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Container from 'react-bootstrap/Container';
import { default as lodashGet } from "lodash/get";
import isEmpty from 'lodash/isEmpty';
import cloneDeep from 'lodash/cloneDeep';
import sortBy from 'lodash/sortBy';
import Button from "react-bootstrap/Button";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLongArrowAltRight } from '@fortawesome/free-solid-svg-icons';
import { API } from 'aws-amplify';
import { API_NAME } from '../../../../utils';

import Modal from "../../../common/Modal";
import CardPanel from '../../../common/CardPanel';
import LoadingSpinner from '../../../common/LoadingSpinner';
import { LoadingButton } from '../../../common/LoadingButton';
import PmidSummary from "../../../common/article/PmidSummary";
import { GdmHeader } from '../../GdmHeader';
import { ExternalLink } from '../../../common/ExternalLink';
import { useAmplifyAPIRequestRecycler } from '../../../../utilities/fetchUtilities';
import { renderVariantLabelAndTitle } from './commonFunc';
import { setGdmAction } from '../../../../actions/gdmActions';
import { EXTERNAL_API_MAP } from '../../../../constants/externalApis';

export const VariantEvidencesModal = ({
  gdm,
  variant,
  buttonTitle=null,
  variantScorePK=null
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [variantScores, setVariantScores] = useState(null);
  const [experimentals, setExperimentals] = useState(null);
  const [errorMessage, setErrorMessage] = useState();

  const history = useHistory();
  const dispatch = useDispatch();
  const requestRecycler = useAmplifyAPIRequestRecycler();

  const auth = useSelector((state) => state.auth);

  const fetchObject = async (objType, objPK) => {
    const objUrl = {
      'annotation': '/annotations',
      'group': '/groups',
      'family': '/families',
      'Individual': '/individuals',
      'experimental': '/experimental',
    };
    try {
      const url = `${objUrl[objType]}/${objPK}?embed=False`;
      const object = await requestRecycler.capture(API.get(API_NAME, url));
      return object;
    } catch (error) {
      throw error;
    }
  };

  const fetchGroup = async (groupPK) => {
    const group = await fetchObject("group", groupPK);
    if (group && group.associatedParent) {
      const annotation = await fetchObject("annotation", group.associatedParent);
      if (annotation) {
        group.associatedParent = annotation;
      }
      return group;
    } else {
      return group;
    }
  };

  const fetchFamily = async (familyPK) => {
    const family = await fetchObject("family", familyPK);
    if (family && family.associatedParentType && family.associatedParent) {
      if (family.associatedParentType === "group") {
        const group = await fetchGroup(family.associatedParent);
        if (group) {
          family.associatedParent = group;
        }
        return family;
      } else if (family.associatedParentType === "annotation") {
        const annotation = await fetchObject(family.associatedParentType, family.associatedParent);
        if (annotation) {
          family.associatedParent = annotation;
        }
        return family;
      } else {
        return family;
      }
    } else {
      return family;
    }
  };

  const fetchIndividual = async (individualPK) => {
    const individual = await fetchObject("Individual", individualPK);
    let individualData = {
      individualLabel: individual.label,
      individualPK: individual.PK,
    }
    if (individual) {
      // Check if need to fetch evidence's parent in order to get annotation
      if (individual.associatedParentType && individual.associatedParent) {
        switch (individual.associatedParentType) {
          case "annotation":
            const annotation = await fetchObject(individual.associatedParentType, individual.associatedParent);
            if (annotation) {
              individualData.pmid = lodashGet(annotation, "article", null);
              individualData.annotationPK = lodashGet(annotation, "PK", null);
              individualData.gdmPK = lodashGet(annotation, "associatedGdm", null);
              individual.associatedParent = annotation;
            }
            return individualData;
          case "group":
            const group = await fetchGroup(individual.associatedParent);
            if (group) {
              individualData.groupLabel = lodashGet(group, "label", null);
              individualData.groupPK = lodashGet(group, "PK", null);
              // get annotation PK and pmid from group.associatedParent which is annotation
              individualData.pmid = lodashGet(group, "associatedParent.article", null);
              individualData.annotationPK = lodashGet(group, "associatedParent.PK", null);
              individualData.gdmPK = lodashGet(group, "associatedParent.associatedGdm", null);
              individual.associatedParent = group;
            }
            return individualData;
          case "family":
            const family = await fetchFamily(individual.associatedParent);
            if (family) {
              individualData.familyLabel = lodashGet(family, "label", null);
              individualData.familyPK = lodashGet(family, "PK", null);
              if (family.associatedParentType === "group" && family.associatedParent) {
                const group = family.associatedParent;
                individualData.groupLabel = lodashGet(group, "label", null);
                individualData.groupPK = lodashGet(group, "PK", null);
                // get annotation PK and pmid from group.associatedParent which is annotation
                individualData.pmid = lodashGet(group, "associatedParent.article", null);
                individualData.annotationPK = lodashGet(group, "associatedParent.PK", null);
                individualData.gdmPK = lodashGet(group, "associatedParent.associatedGdm", null);
              } else if (family.associatedParentType === "annotation" && family.associatedParent) {
                individualData.pmid = lodashGet(family, "associatedParent.article", null);
                individualData.annotationPK = lodashGet(family, "associatedParent.PK", null);
                individualData.gdmPK = lodashGet(family, "associatedParent.associatedGdm", null);
              }
              individual.associatedParent = family;
            }
            return individualData;
          default:
            return null;
        }
      }
    } else {
        return null;
    }
  };

  const loadVariantScores = async () => {
    const url = `/variantscore?variantScored=${lodashGet(variant, "PK", null)}&status!=deleted&embed=False`;
    // const url = `/evidencescore`;
    try {
      const results  = await requestRecycler.capture(API.get(API_NAME, url));
      let allVariantScores = [];

      // ??? TODO: group by individual PK
      // ??? Fetch annotation/group/family once if shared
      for (let i = 0; i < results.length; i++) {
        const score = results[i];
        if (!variantScorePK || (variantScorePK && score.PK !== variantScorePK)) {
          if (score && score.scoreStatus === 'Score') {
            await fetchIndividual(score.evidenceScored).then(individualData => {
            // if (score.evidenceType === "Individual") {
            // await fetchObject(score.evidenceType, score.evidenceScored).then(individualData => {
              // ??? Put evidence to variantScore object
              if (individualData) {
                // let newResult = cloneDeep(results[i]);
                // newResult.evidenceScored = individual;
                // allVariantScores.push(newResult);
                individualData.variantPK = variant.PK;
                individualData.defaultScore = score.calculatedScore;
                individualData.modifiedScore = score.score;
                allVariantScores.push(individualData);
              }
            });
            // }
          }
        }
      }
      setVariantScores(allVariantScores);
    } catch (error) {
      throw error;
      // ??? console.log('Get variant scores error:', error);
    } finally {
      // ??? setIsLoading(false);
    }
  };

  const loadExperimentals = async () => {
    // From legacy codes, the evidencescore objects were not deleted when its parent evidence (individual/case control/experimental) was delted
    const variantPK = lodashGet(variant, "PK", null);
    const url = `/experimental?status!=deleted&scores=exists&variants[contains]=${variantPK}`;
    let allExperimentals = [];
    try {
      const results = await requestRecycler.capture(API.get(API_NAME, url));
      // Loop thru to find experimental data has scored evidenceScore
      for (let i = 0; i < results.length; i++) {
        const experimental = results[i];
        if (experimental.scores && experimental.scores.length) {
          const foundScore = experimental.scores.filter(scoreObj => {
            return scoreObj.scoreStatus === "Score";
          });
          /* ???
             pmid: lodashGet(annotation, "article.pmid", null),
             annotationPK: lodashGet(annotation, "PK", null),
             gdmPK: lodashGet(annotation, "associatedGdm", null),
             missing annotation data, need to add associatedParent to all experimental objects
          */
          if (foundScore && foundScore.length) {
            const experimentalData = {
              variantPK: variantPK,
              PK: lodashGet(experimental, "PK", null),
              label: lodashGet(experimental, "label", null),
              evidenceType: lodashGet(experimental, "evidenceType", null),
            } 
            allExperimentals.push(experimentalData);
          } 
        }
      }
      /* ??? from annotations
      const url = `/annotations?experimentalData=exists`;
      const results = await requestRecycler.capture(API.get(API_NAME, url));
      if (results[i].experimentalData && results[i].experimentalData.length) {
          for (let j = 0; j < results[i].experimentalData.length; j++) {
            const annotation = results[i];
            const experimental = annotation.experimentalData[j];
            if (experimental.variants && experimental.variants.length &&
              experimental.scores && experimental.scores.length) {
              const foundVariant = experimental.variants.filter(variantObj => {
                return variantObj.PK === variantPK;
              });
              const foundScore = experimental.scores.filter(scoreObj => {
                return scoreObj.scoreStatus === "Score";
              });
              if (foundVariant && foundVariant.length && foundScore && foundScore.length) {
                const experimentalData = {
                  variantPK: variantPK,
                  PK: lodashGet(experimental, "PK", null),
                  label: lodashGet(experimental, "label", null),
                  evidenceType: lodashGet(experimental, "evidenceType", null),
                  pmid: lodashGet(annotation, "article.pmid", null),
                  annotationPK: lodashGet(annotation, "PK", null),
                  gdmPK: lodashGet(annotation, "associatedGdm", null),
                }
                // allExperimentals.push(results[i]);
                allExperimentals.push(experimentalData);
              }
            }
          }
      }
      */

      setExperimentals(allExperimentals);
    } catch (error) {
      console.log('Get experimentals error: %o', error);
      setErrorMessage('Get error when loading experimental data.');
    } finally {
      // ??? setIsLoading(false);
    }
  };

  /* ???
    const orig_loadExperimentals = async () => {
      const url = `/experimental?status!=deleted&scores=exists&variants[contains]=${variantPK}`;
      let allExperimentals = [];
      try {
        const results = await requestRecycler.capture(API.get(API_NAME, url));
        // Loop thru to find experimental data has scored evidenceScore
        for (let i = 0; i < results.length; i++) {
          if (results[i].scores && results[i].scores.length) {
            const foundScore = results[i].scores.filter(scoreObj => {
              return scoreObj.scoreStatus === "Score";
            });
            if (foundScore && foundScore.length) {
              if (results[i].associatedParent) {
                const annotation = await fetchObject("annotation", results[i].associatedParent);
                results[i].associatedParent = annotation;
              }
              const experimentalData = {
                PK: lodashGet(results[i], "PK", null),
                label: lodashGet(results[i], "label", null),
                evidenceType: lodashGet(results[i], "evidenceType", null),
                pmid: lodashGet(results[i], "associatedParent.article.pmid", null),
                annotationPK: lodashGet(results[i], "associatedParent.PK", null),
                gdmPK: lodashGet(results[i], "associatedParent.associatedGdm", null),
              }
              allExperimentals.push(experimentalData);
            }
          }
        }
        setExperimentals(allExperimentals);
      } catch (error) {
        console.log('Get experimentals error: %o', error);
        setErrorMessage('Get error when loading experimental data.');
      } finally {
        // setIsLoading(false);
      }
    };
  ??? */


  /* ???
  useEffect(() => {
    setIsLoading(true);
    loadVariantScores().then(result => {
      loadExperimentals();
      setIsLoading(false);
    }).catch(error => {
      console.log('Get variantScores error: %o', error);
      setErrorMessage('Get error when loading variant scores data.');
      setIsLoading(false);
    });

    return () => {
      requestRecycler.cancelAll();
      setIsLoading(false);
    }
  }, []);
  */

  const onViewClick = () => {
    setIsModalOpen(true);
    setIsLoading(true);
    loadVariantScores().then(result => {
      loadExperimentals();
      setIsLoading(false);
    }).catch(error => {
      console.log('Get variantScores error: %o', error);
      setErrorMessage('Get error when loading variant scores data.');
      setIsLoading(false);
    });
  };

  const onModalCancel = () => {
    requestRecycler.cancelAll();
    setIsModalOpen(false);
    setIsLoading(false);
    setErrorMessage(null);
  };

  /* ??? already viewing active annotaion, this link will not work
        {gdm &&
          <Link to={`/curation-central/${gdm.PK}${activeAnnotation
            ? `/annotation/${activeAnnotation.PK}`
            : '' }`}>
            <i className="icon icon-briefcase" />
          </Link>
        }
  ??? */
  const renderVariantInfo = () => (
    <>
      <div>
        {variant.clinvarVariantId &&
          <span>
            <span className="term-name"> &#x2F;&#x2F; ClinVar Variation ID: </span>
            <span className="term-value">
              <ExternalLink
                href={`${EXTERNAL_API_MAP['ClinVarSearch']}${variant.clinvarVariantId}`}
                title={`ClinVar entry for variant ${variant.clinvarVariantId} in new tab`}
              >
                {variant.clinvarVariantId}
              </ExternalLink>
            </span>
          </span>
        }
        {variant.carId &&
          <span>
            <span className="term-name"> &#x2F;&#x2F; ClinGen Allele Registry ID: </span>
            <span className="term-value">
              <ExternalLink
                href={`${EXTERNAL_API_MAP['CARallele']}${variant.carId}.html`}
                title={`ClinGen Allele Registry entry for variant ${variant.carId} in new tab`}
              >
                {variant.carId}
              </ExternalLink>
            </span>
          </span>
        }
      </div>
      <div>
        {renderVariantLabelAndTitle(variant, false, true)}
      </div>
    </>
  );

          // <ul style="list-style-type: none;">
  const renderGeneticEvidences = () => {
    return (
      <div>
        {variantScores && variantScores.length ?
          <>
          {variantScores.map((score, i) => {
            return (
              <ul key={`${score.individualPK}-${score.individualPK}-ind`} style={{'listStyleType': 'none'}}>
                <li key={`${score.individualPK}-${score.individualPK}-ind-1-${i}`}>
                {score.pmid ?
                  <>
                  PMID: <ExternalLink
                    href={`${EXTERNAL_API_MAP['PubMed']}${score.pmid}`}
                    title="PubMed article in a new tab">{score.pmid} </ExternalLink>
                    <FontAwesomeIcon icon={faLongArrowAltRight} className="mx-2" />
                  </>
                : null }
                {score.individualLabel ?
                  <>
                  Individual: <Link
                    to={`/curation-central/${score.gdmPK}/annotation/${score.annotationPK}/individual-curation/${score.individualPK}/view`}
                    target="_blank"> {score.individualLabel} <i className="icon icon-proband"></i></Link>
                  </>
                : null }
                {score.familyLabel ?
                  <>
                  , Family: <Link
                    to={`/curation-central/${score.gdmPK}/annotation/${score.annotationPK}/family-curation/${score.familyPK}/view`}
                    target="_blank"> {score.familyLabel}</Link>
                  </>
                : null }
                {score.groupLabel ?
                  <>
                  , Group: <Link
                    to={`/curation-central/${score.gdmPK}/annotation/${score.annotationPK}/group-curation/${score.groupPK}/view`}
                    target="_blank"> {score.groupLabel}</Link>
                  </>
                : null }
                </li>
                <li key={`${score.individualPK}-${score.individualPK}-ind-2-${i}`}>
                {score.defaultScore ?
                  <>
                  Individual variant score: {score.modifiedScore ? score.modifiedScore : score.defaultScore}
                  </>
                : null }
                </li>
              </ul>
            );
          })}
          </>
        : <span>None</span> }
      </div>
    );
  };

  const renderExperimentalEvidences = () => {
    return (
      <div>
        {experimentals && experimentals.length ?
          <>
          {experimentals && experimentals.map((experimental, i) => {
            return (
              <ul key={`${experimental.variantPK}-{${experimental.PK}-exp`} style={{'listStyleType': 'none'}}>
                <li key={`${experimental.variantPK}-{${experimental.PK}-exp-${i}`}>
                {experimental.pmid ?
                  <>
                  PMID: <ExternalLink
                    href={`${EXTERNAL_API_MAP['PubMed']}${experimental.pmid}`}
                    title="PubMed article in a new tab">{experimental.pmid} </ExternalLink>
                    <FontAwesomeIcon icon={faLongArrowAltRight} className="mx-2" />
                  </>
                : null }
                {experimental.evidenceType ?
                  <>
                   {experimental.evidenceType}
                  </>
                : null }
                {experimental.label && experimental.annotationPK ?
                  <>
                  <Link
                    to={`/curation-central/${experimental.gdmPK}/annotation/${experimental.annotationPK}/experimental-curation/${experimental.PK}/view`}
                    target="_blank"> {experimental.label}</Link>
                  </>
                : <> <strong>{experimental.label}</strong></> }
                </li>
              </ul>
            );
          })}
          </>
        : <span>None</span> }
      </div>
    );
  };

  return (
    <>
      <Modal
        show={isModalOpen}
        title="View Scored Evidence for this Variant"
        className="variant-evidence"
        onHide={onModalCancel}
        onSave={onModalCancel}
        isLoadingSave={isLoading}
        saveButtonText="Close"
        saveButtonInProgressText="Loading"
        hideButtonText="Close"
        showHideButton={false}
      >
    {!isLoading
      ? (
        <>
          <Container>
            {variant &&
              <h4>{renderVariantInfo()}</h4>
            }
            <CardPanel title="Genetic Evidence:">
              {renderGeneticEvidences()}
            </CardPanel>
            <CardPanel title="Experimental Evidence:">
              {renderExperimentalEvidences()}
            </CardPanel>
          </Container>
        </>
      ) : (
        <LoadingSpinner className="mt-4" />
      )
    }
      </Modal>
      <Button className="flex-fill title-ellipsis font-size-12" onClick={onViewClick}>
        {buttonTitle ? buttonTitle : lodashGet(variant, "preferredTitle", null)}
      </Button>
    </>
  );
};
