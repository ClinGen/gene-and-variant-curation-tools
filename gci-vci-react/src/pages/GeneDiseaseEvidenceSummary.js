import React, { useState, useEffect, useMemo } from 'react';
import { connect } from 'react-redux';
import axios from 'axios';
import cloneDeep from 'lodash/cloneDeep';
import has from 'lodash/has';
import isEmpty from 'lodash/isEmpty';
import { get as lodashGet } from 'lodash';
import Button from 'react-bootstrap/Button';
import { API } from 'aws-amplify';

import { API_NAME } from '../utils';
import LoadingSpinner from '../components/common/LoadingSpinner'
import { useAmplifyAPIRequestRecycler } from '../utilities/fetchUtilities';
import { gdmAnnotationIsEarliestPublication } from '../utilities/gdmUtilities';
import { EXTERNAL_API_MAP } from '../constants/externalApis';
import CASE_INFO_TYPES from '../helpers/case_info_types';
import { isScoringForCurrentSOP } from '../helpers/sop';
import CaseLevelEvidencePanelSop7 from '../components/gene-disease-summary/CaseLevelEvidencePanelSop7';
import CaseLevelEvidenceProbandVariantsPanel from '../components/gene-disease-summary/CaseLevelEvidenceProbandVariantsPanel';
import CaseLevelEvidenceProbandSegregationPanel from '../components/gene-disease-summary/CaseLevelEvidenceProbandSegregationPanel';
import SegregationEvidencePanel from '../components/gene-disease-summary/SegregationEvidencePanel';
import CaseControlEvidencePanel from '../components/gene-disease-summary/CaseControlEvidencePanel';
import ExperimentalEvidencePanel from '../components/gene-disease-summary/ExperimentalEvidencePanel';
import NonscorableEvidencePanel from '../components/gene-disease-summary/NonscorableEvidencePanel';
import GeneDiseaseEvidenceSummaryHeader from '../components/gene-disease-summary/GeneDiseaseEvidenceSummaryHeader';
import GeneDiseaseEvidenceSummaryClassificationMatrix from '../components/gene-disease-summary/classification_matrix';
import VARIANT_SCORE_VARIANT_TYPES from '../components/gene-central/score/constants/variantScoreTypes';
import { getModeInheritanceType, getScoreMOIString, getScoreUpperLimit } from '../components/gene-central/score/helpers/getDefaultScore';
import isHomozygousScore from '../components/gene-central/score/helpers/isHomozygousScore';


const GeneDiseaseEvidenceSummary = ({
  gdm,
  auth,
  annotations,
  ...props
}) => {
  const requestRecycler = useAmplifyAPIRequestRecycler();
  const location = props.location

  const [loading, setLoading] = useState(true);
  const [snapshotGdm, setSnapshotGdm] = useState({});
  const [snapshotAnnotations, setSnapshotAnnotations] = useState(null);
  const [snapshotProvLoaded, setSnapshotProvLoaded] = useState(false);
  const [snapshotPublishDate, setSnapshotPublishDate] = useState(null);
  const [provisional, setProvisional] = useState({});
  const [caseLevelEvidence, setCaseLevelEvidence] = useState([]);
  const [caseLevelEvidenceSegregation, setCaseLevelEvidenceSegregation] = useState([]);
  const [segregationEvidence, setSegregationEvidence] = useState([]);
  const [caseControlEvidence, setCaseControlEvidence] = useState([]);
  const [experimentalEvidence, setExperimentalEvidence] = useState([]);
  const [nonscorableEvidence, setNonscorableEvidence] = useState([]);
  const [hpoTermsCount, setHpoTermsCount] = useState(0);
  const [hpoTermsCollection, setHpoTermsCollection] = useState({});

  const { gdmPK: gdmPKFromRouter } = props.match.params || {};
  const urlQueryString = new URLSearchParams(location.search);
  const snapshotPK = urlQueryString.get('snapshot');
  const isPreview = urlQueryString.get('preview');
  
  // get affiliation or user PK from url querysting
  // if present, this is used to find the matching provisionalClassification (item_type=classification) on gdm for displaying summary header, text, etc
  // otherwise use the current login affiliation or user to find one
  //
  // note that if snapshot PK is provided in url, will use the gdm in the snapshot
  // othterwise, use the gdm in redux (which should be preview mode then)
  const affiliationPKFromQuery = urlQueryString.get('affiliationId');
  const userPKFromQuery = urlQueryString.get('userId');
  const [curatorAffiliationPK, curatorUserPK] = useMemo(() => {
    const curatorAffiliationPK = affiliationPKFromQuery
      ? affiliationPKFromQuery
      : auth.currentAffiliation && auth.currentAffiliation.affiliation_id;
    const curatorUserPK = userPKFromQuery
      ? userPKFromQuery
      : auth && auth.PK;
    return [curatorAffiliationPK, curatorUserPK];
  }, [affiliationPKFromQuery, auth.currentAffiliation && auth.currentAffiliation.affiliation_id, userPKFromQuery, auth.PK]) 

  useEffect(() => {
    let mounted = true;
    const getSnapshotData = async () => {
      try {
        const url =`/snapshots/${snapshotPK}/complete`;
        const snapshot = await requestRecycler.capture(API.get(API_NAME, url));
        if (mounted && snapshot && snapshot.resourceParent && snapshot.resourceParent.gdm) {
          setSnapshotGdm(snapshot.resourceParent.gdm);
          if (snapshot.resourceParent.gdm.annotations) {
            setSnapshotAnnotations(snapshot.resourceParent.gdm.annotations);
          } else {
            // Initially set to null.  Set to empty array to indicate snapshot data is loaded and no annotation is found in snapshot.
            setSnapshotAnnotations([]);
          }
          const { provisionalClassifications } = snapshot.resourceParent.gdm;
          if (provisionalClassifications && provisionalClassifications.length) {
            provisionalClassifications.some((provisionalClassification) => {
              const affiliation = provisionalClassification.affiliation || null;
              const creator = provisionalClassification.submitted_by;
              if ((affiliation && curatorAffiliationPK && affiliation === curatorAffiliationPK) ||
                (!affiliation && !curatorAffiliationPK && creator.PK === curatorUserPK)) {
                setProvisional(provisionalClassification);
                return true;
              }
              return false;
            });
          }
          setSnapshotProvLoaded(true);
        }
        if (snapshot.resource && snapshot.resource.publishClassification && snapshot.resource.publishDate) {
          setSnapshotPublishDate(snapshot.resource.publishDate);
        }
      } catch (error) {
        console.log(error);
        setLoading(false);
      }
    };

    if (!isPreview && snapshotPK) {
      getSnapshotData();
    }
    return () => {
      mounted = false;
      requestRecycler.cancelAll();
      setLoading(false);
    };
  }, []);

  useEffect(() => {
    let annotationsData;
    if (auth) {
      if (snapshotPK) {
        // If snapshot, call to get annotations from snapshot even empty annotations array.
        // Check that both annotations and provisional data have been loaded from snapshot before parsing data
        if (snapshotAnnotations && snapshotProvLoaded && provisional) {
          annotationsData = cloneDeep(snapshotAnnotations);
          parseEvidenceData(annotationsData);
        }
      } else {
        // if not snapshot, get annotations from redux
        if (gdm && gdm.provisionalClassifications && gdm.provisionalClassifications.length) {
          gdm.provisionalClassifications.some((provisionalClassification) => {
            const affiliation = provisionalClassification.affiliation || null;
            const creator = provisionalClassification.submitted_by;
            if ((affiliation && curatorAffiliationPK && affiliation === curatorAffiliationPK) ||
              (!affiliation && !curatorAffiliationPK && creator.PK === curatorUserPK)) {
              setProvisional(provisionalClassification);
              return true;
            }
            return false;
          });
        }
        if (annotations && !isEmpty(annotations.byPK)) {
          const keys = Object.keys(annotations.byPK);
          annotationsData = keys.map(key => annotations.byPK[key]);
          if (annotationsData && annotationsData[0].associatedGdm === gdmPKFromRouter) {
            parseEvidenceData(annotationsData);
          }
        } else if (gdm && (!gdm.annotations || (gdm.annotations && gdm.annotations.length === 0))){
          setLoading(false);
        }
      }
    }
  }, [annotations, snapshotAnnotations, provisional, snapshotProvLoaded]);

  useEffect(() => {
    // Start display when all HPO terms have been fetched and set to hpoTermsCollection before displaying
    if (!isEmpty(hpoTermsCollection) && Object.keys(hpoTermsCollection).length === hpoTermsCount) {
      setLoading(false);
    }
  }, [hpoTermsCollection]);

  const parseEvidenceData = (annotationsData) => {
    if (annotationsData && annotationsData.length) {
      parseExperimentalEvidence(annotationsData, curatorUserPK, curatorAffiliationPK);
      parseNonscorableEvidence(annotationsData);
      // parsing of case-level, segregation, and case-control return hpoIds to be fetched separately
      const caseLevelHpoIds = parseCaseLevelEvidence(annotationsData, curatorUserPK, curatorAffiliationPK);
      const segregationHpoIds = parseCaseLevelSegregationEvidence(annotationsData, curatorUserPK, curatorAffiliationPK);
      const caseControlHpoIds = parseCaseControlEvidence(annotationsData, curatorUserPK, curatorAffiliationPK);
      const hpoIdsMap = {
        caseLevel: caseLevelHpoIds,
        segregation: segregationHpoIds,
        caseControl: caseControlHpoIds,
      };
      fetchHpoTerms(hpoIdsMap);
    } else {
      setLoading(false);
    }
  };

  /**
   * Method to map the score's case info type to their description
   * @param {string} caseInfoType - case info type constant value
   */
  const mapVariantType = (caseInfoType) => {
    let variantTypeDescription;
    const allVariantTypes = CASE_INFO_TYPES.OTHER;
    allVariantTypes.forEach(variant => {
      if (variant.TYPE === caseInfoType) {
        variantTypeDescription = variant.DESCRIPTION;
      }
    });
    return variantTypeDescription;
  };
  
  /**
   * Method to map the experimental subtype to their corresponding parent type
   * @param {object} evidence - scored experimental evidence
   */
  const mapEvidenceSubtype = (evidence) => {
    let type;
    if (evidence && evidence.evidenceType) {
      switch (evidence.evidenceType) {
        case 'Biochemical Function':
          type = evidence.biochemicalFunction.geneWithSameFunctionSameDisease && Object.keys(evidence.biochemicalFunction.geneWithSameFunctionSameDisease).length ?
            'A' : 'B';
          break;
        case 'Protein Interactions':
          type = evidence.proteinInteractions.interactionType ? evidence.proteinInteractions.interactionType : null;
          break;
        case 'Expression':
          type = evidence.expression.normalExpression && Object.keys(evidence.expression.normalExpression).length ?
              'A' : 'B';
          break;
        case 'Functional Alteration':
          type = evidence.functionalAlteration.functionalAlterationType ? evidence.functionalAlteration.functionalAlterationType : null;
          break;
        case 'Model Systems':
          type = evidence.modelSystems.modelSystemsType ? evidence.modelSystems.modelSystemsType : null;
          break;
        case 'Rescue':
          type = evidence.rescue.rescueType ? evidence.rescue.rescueType : null;
          break;
        default:
          type = '';
      }
    }
    return type;
  };

  /**
   * Method to map the experimental evidence type to their corresponding explanations
   * @param {object} evidence - scored experimental evidence
   */
  const mapExperimentalEvidenceExplanation = (evidence) => {
    let explanation;
    if (evidence && evidence.evidenceType) {
      switch (evidence.evidenceType) {
        case 'Biochemical Function':
          if (evidence.biochemicalFunction.geneWithSameFunctionSameDisease && Object.keys(evidence.biochemicalFunction.geneWithSameFunctionSameDisease).length) {
            explanation = evidence.biochemicalFunction.geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction
              ? evidence.biochemicalFunction.geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction : '';
          } else if (evidence.biochemicalFunction.geneFunctionConsistentWithPhenotype && Object.keys(evidence.biochemicalFunction.geneFunctionConsistentWithPhenotype).length) {
            explanation = evidence.biochemicalFunction.geneFunctionConsistentWithPhenotype.explanation
              ? evidence.biochemicalFunction.geneFunctionConsistentWithPhenotype.explanation : '';
          }
          break;
        case 'Protein Interactions':
          explanation = evidence.proteinInteractions.relationshipOfOtherGenesToDisese
            ? evidence.proteinInteractions.relationshipOfOtherGenesToDisese : null;
          break;
        case 'Expression':
          if (evidence.expression.normalExpression && Object.keys(evidence.expression.normalExpression).length) {
            explanation = evidence.expression.normalExpression.evidence ? evidence.expression.normalExpression.evidence : '';
          } else if (evidence.expression.alteredExpression && Object.keys(evidence.expression.alteredExpression).length) {
            explanation = evidence.expression.alteredExpression.evidence ? evidence.expression.alteredExpression.evidence : '';
          }
          break;
        case 'Functional Alteration':
          explanation = evidence.functionalAlteration.evidenceForNormalFunction ? evidence.functionalAlteration.evidenceForNormalFunction : null;
          break;
        case 'Model Systems':
          explanation = evidence.modelSystems.explanation ? evidence.modelSystems.explanation : null;
          break;
        case 'Rescue':
          explanation = evidence.rescue.explanation ? evidence.rescue.explanation : null;
          break;
        default:
          explanation = '';
      }
    }
    return explanation;
  };

  const fetchHpoTerms = (hpoIdsMap) => {
    const evidenceTypes = Object.keys(hpoIdsMap);
    let allHpoIds = [];
    evidenceTypes.forEach((evidenceType) => {
      allHpoIds = allHpoIds.concat(hpoIdsMap[evidenceType]);
    });
    const uniqueHpoIds = allHpoIds.length ? [...(new Set(allHpoIds))] : [];
    if (isEmpty(uniqueHpoIds)) {
      setLoading(false);
    }

    // Set count to check all HPO terms have been fetched before displaying
    setHpoTermsCount(Object.keys(uniqueHpoIds).length);

    const promises = Object.values(uniqueHpoIds).map(async id => {
      const checkedId = id.match(/HP:\d{7}/g);
      const url = EXTERNAL_API_MAP['HPOApi'] + checkedId;
      return axios.get(url).then((result) => {
        if (result && result.data && result.data.details) {
          const { name } = result.data.details;
          return { id, name };
        }
        return id;
      }).catch(() => {
        return { id };
      });
    });

    Promise.all(promises).then((results) => {
      if (results && results.length) {
        const resultsMap = {};
        results.forEach(result => {
          const { id, name } = result;
          resultsMap[id] = name ? name : id + ' (note: term not found)';
        });
        setHpoTermsCollection(resultsMap);
      }
    }).catch((error) => {
      console.log(error);
    });
  }

  /**
   * Method to loop through individuals (of GDM or of group) and find all scored proband evidence
   * @param {array} individuals - a list of individual evidence
   * @param {array} individualMatched - list of scored proband evidence
   * @param {boolean} currentSOP - displaying data for current SOP
   */
  const individualScraper = (individuals, individualMatched, currentSOP) => {
    // From SOP8, scores are stored in individual.variantScores.
    // Before SOP8, scores are stored in individual.scores.
    if (individuals && individuals.length) {
      individuals.forEach(individual => {
        // When provisional object has not been loaded from snapshot, currentSOP is null so cannot use
        if (currentSOP !== null) {
          if (currentSOP) {
            if (individual.proband === true && (individual.variantScores && individual.variantScores.length)) {
              individualMatched.push(individual);
            }
	  } else {
            if (individual.proband === true && (individual.scores && individual.scores.length)) {
              individualMatched.push(individual);
            }
          }
        }
      });
    }
    return individualMatched;
  };

  /**
   * Method to loop through families (of GDM or of group) and find all scored proband evidence
   * @param {array} families - a list of family evidence
   * @param {array} individualMatched - list of scored proband evidence
   * @param {boolean} currentSOP - displaying data for current SOP
   */
  const familyScraper = (families, individualMatched, currentSOP) => {
    // From SOP8, scores are stored in individual.variantScores.
    // Before SOP8, scores are stored in individual.scores.
    if (families && families.length) {
      families.forEach(family => {
        if (family.segregation && family.individualIncluded && family.individualIncluded.length) {
          // `individual.associatedFamilies` is not a reliable family source when fetched from snapshot instead of redux (latest, used in preview mode), so we use `family` from this for loop context instead
          // Reason is `individual.associatedFamilies` is array of an embedded object in old snapshot, but a PK in new snapshot;
          // using `family` from this for loop ensures `individual.associatedFamilies` is a family object
          // note that `familyScraper()` will only run for snapshot summary and not preview summary
          const associatedFamily = {
            ...family,
            // remove nested individual objects to avoid circular structure when assign on individual as associatedFamilies later
            individualIncluded: (family.individualIncluded || []).map(individual => {
              if (typeof individual === 'object') {
                return individual.PK;
              }
              return individual;
            })
          };

          // add field `associatedFamilies` to individual, make sure the field is an object and not PK
          const individualsWithAssociatedFamily = family.individualIncluded.map(individual => {
            if (individual && typeof individual === 'object') {
              return {
                ...individual,
                associatedFamilies: [associatedFamily]
              }
            }
            return individual;
          });
          individualMatched = individualScraper(
            individualsWithAssociatedFamily,
            individualMatched,
            currentSOP
          );
        }
      });
    }
    return individualMatched;
  };

  /**
   * Method to loop through families (of GDM or of group) and find all family evidence without proband, or with proband but no score
   * @param {array} families - a list of family evidence
   * @param {array} familyMatched - list of matched family evidence
   * @param {boolean} currentSOP - displaying data for current SOP
   */
  const segregationScraper = (families, familyMatched, currentSOP) => {
    // From SOP8, scores are stored in individual.variantScores.
    // Before SOP8, scores are stored in individual.scores.
    if (families && families.length) {
      families.forEach(family => {
        if (family.segregation) {
          if (family.individualIncluded && family.individualIncluded.length) {
            let scoredProbands = null;
            // When provisional object has not been loaded from snapshot, currentSOP is null so cannot use
            if (currentSOP !== null) {
              if (currentSOP) {
                // Check if variantScore has score/review/contracticts data then not incluaded
                scoredProbands = family.individualIncluded.filter(individual => {
                  if (individual.proband && individual.variantScores && individual.variantScores.length) {
                    const foundScored = individual.variantScores.filter(score => 'scoreStatus' in score && score.scoreStatus !== '' && score.scoreStatus !== 'none');
                    if (foundScored && foundScored.length) {
                      return true;
                    }
                  }
                });
              } else {
                scoredProbands = family.individualIncluded.filter(individual => individual.proband && individual.scores && individual.scores.length);
              }
            }
            if (scoredProbands && scoredProbands.length) {
              return false;
            } else {
              familyMatched.push(family);
            }
          }
          if (!family.individualIncluded || (family.individualIncluded && !family.individualIncluded.length)) {
            familyMatched.push(family);
          }
        }
      });
    }
    return familyMatched;
  };

  /**
   * Method to get the total score of given proband individual
   * @param {object} probandIndividual - individual object
   * @param {boolean} doubleCount - individual score should be doubled because of homozygous selection
   */
  const getProbandTotalScore = (probandIndividual, doubleCount) => {
    let allScores = [];
    probandIndividual && probandIndividual.variantScores && probandIndividual.variantScores.forEach(variantScore => {
      let score;
      if ('scoreStatus' in variantScore && variantScore.scoreStatus.indexOf('Score') > -1) {
        score = 'score' in variantScore && !isNaN(parseFloat(variantScore.score)) ? parseFloat(variantScore.score) : parseFloat(variantScore.calculatedScore);
        allScores.push(score);
        if (doubleCount) {
          allScores.push(score);
        }
      }
    });
    const totalScore = allScores.reduce((a, b) => a + b, 0);
    return parseFloat(totalScore).toFixed(2);
  };

  /**
   * Method to find the scored case level (proband) evidence entries both created
   * by the currently logged-in user or simply just scored by this user
   * @param {array} annotationsList - a list of annotations in a given gdm
   * @param {string} userPK - logged in user PK
   * @param {string} curatorAffiliationPK - logged in user's associated affiliation PK
   */
  const parseCaseLevelEvidence = (annotationsList, userPK, curatorAffiliationPK) => {
    let hpoIds = [];
    // Check SOP version
    // If not from snapshot, latest SOP version
    // If from snapshot, check provisional.classificationPoints for SOP version
    // When adding support for SOP8, change to support publishing both SOP7 and SOP8
    // If version 8 (current version), get individual scores from variantScore objects
    // If version 7 or earlier, get individual scores from evidenceScore objects
    const currentSOP = isPreview ? true
      : (snapshotPK && provisional && provisional.classificationPoints ? isScoringForCurrentSOP(provisional.classificationPoints) : null);
    /*****************************************************/
    /* Find all proband individuals that had been scored */
    /*****************************************************/
    let probandTotal = [], tempFamilyScraperValues = [];

    if (annotationsList.length) {
      annotationsList.forEach(annotation => {
        let individualMatched = [];
        let families;
        // Iterate groups
        let groups = annotation.groups && annotation.groups.length ? annotation.groups : [];
        if (groups && groups.length) {
          groups.forEach(group => {
            families = group.familyIncluded && group.familyIncluded.length ? group.familyIncluded : [];
            tempFamilyScraperValues = familyScraper(families, individualMatched, currentSOP);
            individualMatched = tempFamilyScraperValues;
            // get proband individuals of group
            if (group.individualIncluded && group.individualIncluded.length) {
              individualMatched = individualScraper(group.individualIncluded, individualMatched, currentSOP);
            }
          });
        }

        // Iterate families 
        families = annotation.families && annotation.families.length ? annotation.families : [];
        tempFamilyScraperValues = familyScraper(families, individualMatched, currentSOP);
        individualMatched = tempFamilyScraperValues;

        // push all matched individuals from families and families of groups to probandTotal
        individualMatched.forEach(item => {
          item.associatedAnnotation = annotation;
          probandTotal.push(item);
        });

        // Iterate individuals
        let individuals = annotation.individuals && annotation.individuals.length ? annotation.individuals : [];
        if (individuals && individuals.length) {
          // get proband individuals
          individualMatched = [];
          individualMatched = individualScraper(individuals, individualMatched, currentSOP);
          // push all matched individuals to probandTotal
          individualMatched.forEach(item => {
            item.associatedAnnotation = annotation;
            probandTotal.push(item);
          });
        }
      });
    }

    // If have proband individual, get evidence data according to SOP version
    // If SOP 8, score data is stored in individual.variantScores list
    // If SOP 7 or less, score data is stored in individual.scores list
    if (probandTotal && probandTotal.length) {
      // When provisional object has been loaded from snapshot and currentSOP is set and 1not null then parse data
      if (currentSOP !== null) {
        if (currentSOP) {
          hpoIds = parseCaseLevelEvidenceList(probandTotal, userPK);
        } else {
          hpoIds = parseCaseLevelEvidenceListSop7(probandTotal, userPK);
        }
      }
    }
    return hpoIds;
  };

  /**
   * Method to find the scored case level (proband) evidence entries both created
   * by the currently logged-in affiliation or simply just scored affiliation
   * The proband individual evidence scores are stored in variantScores list from SOP8 version
   * @param {array} probandList - a list of proband individual evidence
   * @param {string} userPK - proband individual PK
   */
  const parseCaseLevelEvidenceList = (probandList, userPK) => {
    const caseLevelEvidenceList = [];
    const caseLevelEvidenceSegregationList = [];
    const currentGdm = snapshotPK ? snapshotGdm : gdm;
    let hpoIds = [];

    // Iterate probands
    probandList.forEach(proband => {
      // If proband has score data, add its associated family to the family segrgation table
      let addFamilyToSeg = false;
      // Loop through variantScores, if any
      if (proband.variantScores && proband.variantScores.length > 0) {
        // If AR and homozygous or
        // if SD and probandIs = Biallelic homozygous => AR and homozygous or
        // if SD and probandIs = Biallelic compound heterozygous => AR and homozygous is checked
        // then variant is counted/shown twice
        const moiType = currentGdm && currentGdm.modeInheritance ? getModeInheritanceType(currentGdm.modeInheritance) : "";
        const doubleCount = isHomozygousScore(moiType, proband.recessiveZygosity, proband.probandIs);
        // If has more than 1 score, check if save data selected and have score limit
        let totalLimit = 0;
        if (doubleCount ||
          (proband.variantScores.length > 1 &&
          proband.variantScores[0].variantType === proband.variantScores[1].variantType &&
          proband.variantScores[0].functionalDataSupport === proband.variantScores[1].functionalDataSupport &&
          proband.variantScores[0].deNovo === proband.variantScores[1].deNovo)) {
          totalLimit = getScoreUpperLimit(getScoreMOIString(moiType, proband.probandIs), proband.variantScores[0]);
        }
        const probandScoreTotal = getProbandTotalScore(proband, doubleCount);
        const probandScoreCounted = totalLimit && totalLimit < probandScoreTotal ? totalLimit : probandScoreTotal;

        const associatedAnnotation = proband.associatedAnnotation || {};
        let associatedFamily = null;
        if (associatedAnnotation && proband.associatedFamilies && proband.associatedFamilies.length > 0) {
          // in `familyScraper` we made sure `proband.associatedFamilies` is embeded family object(s)
          associatedFamily = proband.associatedFamilies[0];
        }
        const pubDate = associatedAnnotation.article && (/^([\d]{4})(.*?)$/).exec(associatedAnnotation.article.date);
        const segregation = associatedFamily && associatedFamily.segregation ? associatedFamily.segregation : null;
        const earliestPub = gdmAnnotationIsEarliestPublication(lodashGet(currentGdm, "earliestPublications", null), associatedAnnotation.PK);
        // Check each variantScore and add to evidence if valid
        proband.variantScores.forEach(variantScore => {
          // Only interested in the logged-in user's scores and their associated evidence
          // SOP8 - should only have variantScores for logged-in user/affiliation
          if ((variantScore.affiliation && curatorAffiliationPK && variantScore.affiliation === curatorAffiliationPK)
            || (!variantScore.affiliation && !curatorAffiliationPK && variantScore.submitted_by.PK === userPK)) {
            if ('scoreStatus' in variantScore && (variantScore.scoreStatus !== 'none' && variantScore.scoreStatus !== '')) {
              // This variantScore has score so add its associated family to table
              addFamilyToSeg = true;
              let evidence = {};
              // Define object key/value pairs
              evidence['label'] = proband.label ? proband.label : '';
              evidence['earliestPub'] = earliestPub;
              evidence['pmid'] = associatedAnnotation.article && associatedAnnotation.article.pmid;
              evidence['pubYear'] = pubDate && pubDate[1];
              evidence['authors'] = associatedAnnotation.article && associatedAnnotation.article.authors;
              evidence['sex'] = proband.sex ? proband.sex : '';
              evidence['ageType'] = proband.ageType ? proband.ageType : '';
              evidence['ageValue'] = proband.ageValue ? proband.ageValue : null;
              evidence['ageUnit'] = proband.ageUnit && proband.ageUnit.length ? proband.ageUnit : '';
              evidence['probandIs'] = proband.probandIs ? proband.probandIs : '';
              evidence['ethnicity'] = proband.ethnicity && proband.ethnicity.length ? proband.ethnicity : '';
              evidence['hpoIdInDiagnosis'] = proband.hpoIdInDiagnosis && proband.hpoIdInDiagnosis.length
                ? proband.hpoIdInDiagnosis : [];
              evidence['termsInDiagnosis'] = proband.termsInDiagnosis && proband.termsInDiagnosis.length
                ? proband.termsInDiagnosis : '';
              evidence['genotypingMethods'] = proband.method && proband.method.genotypingMethods && proband.method.genotypingMethods.length
                ? proband.method.genotypingMethods : [];

              evidence['previousTestingDescription'] = proband.method && proband.method.previousTestingDescription
                ? proband.method.previousTestingDescription : '';
              evidence['specificMutationsGenotypedMethod'] = proband.method && proband.method.specificMutationsGenotypedMethod
                ? proband.method.specificMutationsGenotypedMethod : '';
              evidence['segregationNumAffected'] = segregation && segregation.numberOfAffectedWithGenotype
                ? segregation.numberOfAffectedWithGenotype : null;
              evidence['segregationNumUnaffected'] = segregation && segregation.numberOfUnaffectedWithoutBiallelicGenotype
                ? segregation.numberOfUnaffectedWithoutBiallelicGenotype : null;
              evidence['segregationPublishedLodScore'] = segregation && segregation.publishedLodScore
                ? segregation.publishedLodScore : null;
              evidence['segregationEstimatedLodScore'] = segregation && segregation.estimatedLodScore
                ? segregation.estimatedLodScore : null;
              evidence['includeLodScoreInAggregateCalculation'] = segregation && has(segregation, 'includeLodScoreInAggregateCalculation') && segregation.includeLodScoreInAggregateCalculation;
              evidence['sequencingMethod'] = segregation && segregation.sequencingMethod
                ? segregation.sequencingMethod : null;
              // SOP8 - new score data
              evidence['variantType'] = VARIANT_SCORE_VARIANT_TYPES[variantScore.variantType];
              evidence['variant'] = variantScore.variantScored;
              evidence['functionalDataSupport'] = variantScore.functionalDataSupport || null;
              evidence['functionalDataExplanation'] = variantScore.functionalDataExplanation || null;
              evidence['deNovo'] = variantScore.deNovo;
              evidence['maternityPaternityConfirmed'] = variantScore.maternityPaternityConfirmed || null;
              evidence['scoreStatus'] = variantScore.scoreStatus;
              evidence['defaultScore'] = doubleCount
                ? (variantScore.calculatedScore ? variantScore.calculatedScore * 2 : null)
                : (variantScore.calculatedScore || null);
              evidence['modifiedScore'] = doubleCount
                ? (has(variantScore, 'score') ? variantScore.score * 2 : null)
                : (has(variantScore, 'score') ? variantScore.score : null);
              evidence['scoreCounted'] = probandScoreCounted;
              evidence['scoreExplanation'] = variantScore.scoreExplanation && variantScore.scoreExplanation.length
                ? variantScore.scoreExplanation : '';

              caseLevelEvidenceList.push(evidence);
              setCaseLevelEvidence(caseLevelEvidenceList);
              hpoIds = hpoIds.concat(evidence.hpoIdInDiagnosis);
            }
          }
        });

        // SOP8 - Add associatedFamily that has scored proband to the "Scored Genetic Evidence: Case Level (segregation)" table 
        if (addFamilyToSeg && associatedFamily) {
          let segEvidence = {};
          // Display label as "family name (proband name)"
          const familyLabel = associatedFamily ? associatedFamily.label : null;
          segEvidence['segLabel'] = familyLabel
            ? `${familyLabel} (${proband.label})`
            : `(${proband.label})`;
          segEvidence['earliestPub'] = earliestPub;
          segEvidence['pmid'] = associatedAnnotation.article && associatedAnnotation.article.pmid;
          segEvidence['pubYear'] = pubDate && pubDate[1];
          segEvidence['authors'] = associatedAnnotation.article && associatedAnnotation.article.authors;
          // Get associatedFamily data
          segEvidence['ethnicity'] = associatedFamily.ethnicity && associatedFamily.ethnicity.length ? associatedFamily.ethnicity : '';
          segEvidence['hpoIdInDiagnosis'] = associatedFamily.hpoIdInDiagnosis && associatedFamily.hpoIdInDiagnosis.length
            ? associatedFamily.hpoIdInDiagnosis : [];
          segEvidence['termsInDiagnosis'] = associatedFamily.termsInDiagnosis && associatedFamily.termsInDiagnosis.length
            ? associatedFamily.termsInDiagnosis : '';
          segEvidence['moi'] = segregation && segregation.moiDisplayedForFamily
            ? segregation.moiDisplayedForFamily : '';
          segEvidence['segregationNumAffected'] = segregation && segregation.numberOfAffectedWithGenotype
            ? segregation.numberOfAffectedWithGenotype : null;
          segEvidence['segregationNumUnaffected'] = segregation && segregation.numberOfUnaffectedWithoutBiallelicGenotype
            ? segregation.numberOfUnaffectedWithoutBiallelicGenotype : null;
          segEvidence['segregationPublishedLodScore'] = segregation && segregation.publishedLodScore
            ? segregation.publishedLodScore : null;
          segEvidence['segregationEstimatedLodScore'] = segregation && segregation.estimatedLodScore
            ? segregation.estimatedLodScore : null;
          segEvidence['includeLodScoreInAggregateCalculation'] = segregation && has(segregation, 'includeLodScoreInAggregateCalculation') && segregation.includeLodScoreInAggregateCalculation;
          segEvidence['sequencingMethod'] = segregation && segregation.sequencingMethod
            ? segregation.sequencingMethod : null;
          caseLevelEvidenceSegregationList.push(segEvidence);
          setCaseLevelEvidenceSegregation(caseLevelEvidenceSegregationList);
          hpoIds = hpoIds.concat(segEvidence.hpoIdInDiagnosis);
        }
      }
    });

    return hpoIds;
  };

  /**
   * Method to find the scored case level (proband) evidence entries both created
   * by the currently logged-in user or simply just scored by this user
   * The proband individual evidence scores are stored in scores pre SOP8 version
   * @param {array} probandList  - a list of proband individual evidence
   * @param {string} userPK - proband individual PK
   */
  const parseCaseLevelEvidenceListSop7 = (probandList, userPK) => {
    const caseLevelEvidenceList = [];
    let hpoIds = [];

    // Iterate probands
    probandList.forEach(proband => {
      // Loop through scores, if any
      if (proband.scores && proband.scores.length) {
        proband.scores.forEach(score => {
          // Only interested in the logged-in user's scores and their associated evidence
          if ((score.affiliation && curatorAffiliationPK && score.affiliation === curatorAffiliationPK)
            || (!score.affiliation && !curatorAffiliationPK && score.submitted_by.PK === userPK)) {
            if ('scoreStatus' in score && (score.scoreStatus !== 'none' || score.scoreStatus !== '')) {
              let caseLevelEvidence = {};
              const associatedAnnotation = proband.associatedAnnotation || {};
              let associatedFamily;
              if (associatedAnnotation && proband.associatedFamilies && proband.associatedFamilies.length > 0) {
                // in `familyScraper` we made sure `proband.associatedFamilies` is embeded family object(s)
                associatedFamily = proband.associatedFamilies[0];
              }
              const pubDate = associatedAnnotation.article && (/^([\d]{4})(.*?)$/).exec(associatedAnnotation.article.date);
              const segregation = associatedFamily && associatedFamily.segregation ? associatedFamily.segregation : null;
              // Define object key/value pairs
              caseLevelEvidence['variantType'] = score.caseInfoType && score.caseInfoType.length ? mapVariantType(score.caseInfoType) : '';
              caseLevelEvidence['variants'] = proband.variants && proband.variants.length ? proband.variants : [];
              caseLevelEvidence['authors'] = associatedAnnotation.article && associatedAnnotation.article.authors;
              caseLevelEvidence['pmid'] = associatedAnnotation.article && associatedAnnotation.article.pmid;
              caseLevelEvidence['pubYear'] = pubDate && pubDate[1];
              caseLevelEvidence['label'] = proband.label ? proband.label : '';
              caseLevelEvidence['sex'] = proband.sex ? proband.sex : '';
              caseLevelEvidence['ageType'] = proband.ageType ? proband.ageType : '';
              caseLevelEvidence['ageValue'] = proband.ageValue ? proband.ageValue : null;
              caseLevelEvidence['ageUnit'] = proband.ageUnit && proband.ageUnit.length ? proband.ageUnit : '';
              caseLevelEvidence['probandIs'] = proband.probandIs ? proband.probandIs : '';
              caseLevelEvidence['ethnicity'] = proband.ethnicity && proband.ethnicity.length ? proband.ethnicity : '';
              caseLevelEvidence['hpoIdInDiagnosis'] = proband.hpoIdInDiagnosis && proband.hpoIdInDiagnosis.length
                ? proband.hpoIdInDiagnosis : [];
              caseLevelEvidence['termsInDiagnosis'] = proband.termsInDiagnosis && proband.termsInDiagnosis.length
                ? proband.termsInDiagnosis : '';
              caseLevelEvidence['previousTestingDescription'] = proband.method && proband.method.previousTestingDescription
                ? proband.method.previousTestingDescription : '';
              caseLevelEvidence['genotypingMethods'] = proband.method && proband.method.genotypingMethods && proband.method.genotypingMethods.length
                ? proband.method.genotypingMethods : [];
              caseLevelEvidence['specificMutationsGenotypedMethod'] = proband.method && proband.method.specificMutationsGenotypedMethod
                ? proband.method.specificMutationsGenotypedMethod : '';
              caseLevelEvidence['scoreStatus'] = score.scoreStatus;
              caseLevelEvidence['defaultScore'] = score.calculatedScore ? score.calculatedScore : null;
              caseLevelEvidence['modifiedScore'] = has(score, 'score') ? score.score : null;
              caseLevelEvidence['scoreExplanation'] = score.scoreExplanation && score.scoreExplanation.length
                ? score.scoreExplanation : '';
              caseLevelEvidence['segregationNumAffected'] = segregation && segregation.numberOfAffectedWithGenotype
                ? segregation.numberOfAffectedWithGenotype : null;
              caseLevelEvidence['segregationNumUnaffected'] = segregation && segregation.numberOfUnaffectedWithoutBiallelicGenotype
                ? segregation.numberOfUnaffectedWithoutBiallelicGenotype : null;
              caseLevelEvidence['segregationPublishedLodScore'] = segregation && segregation.publishedLodScore
                ? segregation.publishedLodScore : null;
              caseLevelEvidence['segregationEstimatedLodScore'] = segregation && segregation.estimatedLodScore
                ? segregation.estimatedLodScore : null;
              caseLevelEvidence['includeLodScoreInAggregateCalculation'] = segregation && has(segregation, 'includeLodScoreInAggregateCalculation') && segregation.includeLodScoreInAggregateCalculation;
              caseLevelEvidence['sequencingMethod'] = segregation && segregation.sequencingMethod
                ? segregation.sequencingMethod : null;
              // Put object into array
              caseLevelEvidenceList.push(caseLevelEvidence);
              setCaseLevelEvidence(caseLevelEvidenceList);
              hpoIds = hpoIds.concat(caseLevelEvidence.hpoIdInDiagnosis);
            }
          }
        });
      }
    });

    return hpoIds;
  };

  /**
   * Method to find the case level segregation evidence entries both created
   * by the currently logged-in user and having LOD scores but without proband
   * @param {array} annotationsList - a list of annotations in a given gdm
   * @param {string} userPK - logged in user PK
   * @param {string} curatorffiliationPK - logged in user's associated affiliation PK
   */
  const parseCaseLevelSegregationEvidence = (annotationsList, userPK, curatorAffiliationPK) => {
    // Check SOP version
    // From SOP8, scores are stored in individual.variantScores.
    // Before SOP8, scores are stored in individual.scores.
    // If not from snapshot, should be current version SOP8
    // If from snapshot, check version from provisional.classificationPoints
    const currentSOP = isPreview ? true
      : (snapshotPK && provisional && provisional.classificationPoints ? isScoringForCurrentSOP(provisional.classificationPoints) : null);
    const currentGdm = snapshotPK ? snapshotGdm : gdm;
    const segregationEvidenceList = [];
    let hpoIds = [];
    let segregationTotal = [], tempSegregationScraperValues = [];
    if (annotationsList.length) {
      annotationsList.forEach(annotation => {
        let familyMatched = [];
        let families;
        // Iterate groups
        let groups = annotation.groups && annotation.groups.length ? annotation.groups : [];
        if (groups && groups.length) {
          groups.forEach(group => {
            families = group.familyIncluded && group.familyIncluded.length ? group.familyIncluded : [];
            tempSegregationScraperValues = segregationScraper(families, familyMatched, currentSOP);
            familyMatched = tempSegregationScraperValues;
          });
        }

        // Iterate families and find all segregation without proband
        families = annotation.families && annotation.families.length ? annotation.families : [];
        tempSegregationScraperValues = segregationScraper(families, familyMatched, currentSOP);
        familyMatched = tempSegregationScraperValues;

        // Push all matched families to segregationTotal
        familyMatched.forEach(item => {
          item.associatedAnnotation = annotation;
          segregationTotal.push(item);
        });
      });
    }

    const filteredSegregationTotal = segregationTotal.filter(family => {
      if ((family.affiliation && curatorAffiliationPK && family.affiliation === curatorAffiliationPK)
        || (!family.affiliation && !curatorAffiliationPK && family.submitted_by.PK === userPK)) {
        const segregation = family.segregation ? family.segregation : null;
        if (segregation && (segregation.estimatedLodScore || segregation.publishedLodScore)) {
          return true;
        }
      }
      return false;
    });

    if (filteredSegregationTotal.length) {
      filteredSegregationTotal.forEach(family => {
        const segregation = family.segregation ? family.segregation : null;
        const segregationEvidence = {};
        const associatedAnnotation = family.associatedAnnotation || {};
        const pubDate = associatedAnnotation.article && (/^([\d]{4})(.*?)$/).exec(associatedAnnotation.article.date);
        // Define object key/value pairs
        segregationEvidence['earliestPub'] = gdmAnnotationIsEarliestPublication(lodashGet(currentGdm, "earliestPublications", null), associatedAnnotation.PK);
        segregationEvidence['authors'] = associatedAnnotation.article && associatedAnnotation.article.authors;
        segregationEvidence['pmid'] = associatedAnnotation.article && associatedAnnotation.article.pmid;
        segregationEvidence['pubYear'] = pubDate && pubDate[1];
        segregationEvidence['label'] = family.label ? family.label : '';
        segregationEvidence['ethnicity'] = family.ethnicity ? family.ethnicity : '';
        segregationEvidence['moiDisplayedForFamily'] = segregation && segregation.moiDisplayedForFamily
          ? segregation.moiDisplayedForFamily : '';
        segregationEvidence['hpoIdInDiagnosis'] = family.hpoIdInDiagnosis && family.hpoIdInDiagnosis.length
          ? family.hpoIdInDiagnosis : [];
        segregationEvidence['termsInDiagnosis'] = family.termsInDiagnosis && family.termsInDiagnosis.length
          ? family.termsInDiagnosis : '';
        segregationEvidence['segregationNumAffected'] = segregation && segregation.numberOfAffectedWithGenotype
          ? segregation.numberOfAffectedWithGenotype : null;
        segregationEvidence['segregationNumUnaffected'] = segregation && segregation.numberOfUnaffectedWithoutBiallelicGenotype
          ? segregation.numberOfUnaffectedWithoutBiallelicGenotype : null;
        segregationEvidence['segregationPublishedLodScore'] = segregation && segregation.publishedLodScore
          ? segregation.publishedLodScore : null;
        segregationEvidence['segregationEstimatedLodScore'] = segregation && segregation.estimatedLodScore
          ? segregation.estimatedLodScore : null;
        segregationEvidence['includeLodScoreInAggregateCalculation'] = segregation && has(segregation, 'includeLodScoreInAggregateCalculation') && segregation.includeLodScoreInAggregateCalculation;
        segregationEvidence['sequencingMethod'] = segregation && segregation.sequencingMethod
          ? segregation.sequencingMethod : null;
        // Put object into array
        segregationEvidenceList.push(segregationEvidence);
        setSegregationEvidence(segregationEvidenceList);
        hpoIds = hpoIds.concat(segregationEvidence.hpoIdInDiagnosis);
      });
    }

    // Iterate segregations

    // return segregationEvidenceList;
    return hpoIds;
  };

  /**
   * Method to find the scored case-control evidence entries both created
   * by the currently logged-in user or simply just scored by this user
   * @param {array} annotationsList - a list of annotations in a given gdm
   * @param {string} userPK - logged in user PK
   * @param {string} curatorffiliationPK - logged in user's associated affiliation PK
   */
  const parseCaseControlEvidence = (annotationsList, userPK, curatorAffiliationPK) => {
    const currentGdm = snapshotPK ? snapshotGdm : gdm;
    const caseControlEvidenceList = [];
    let hpoIds = [];
    if (annotationsList.length) {
      annotationsList.forEach(annotation => {
        // loop through case-controls
        let caseControlStudies = annotation.caseControlStudies && annotation.caseControlStudies.length ? annotation.caseControlStudies : [];
        if (caseControlStudies && caseControlStudies.length) {
          caseControlStudies.forEach(caseControl => {
            // Loop through scores, if any
            if (caseControl.scores && caseControl.scores.length) {
              caseControl.scores.forEach(score => {
                // Only interested in the logged-in user's scores and their associated evidence
                if ((score.affiliation && curatorAffiliationPK && score.affiliation === curatorAffiliationPK)
                  || (!score.affiliation && !curatorAffiliationPK && score.submitted_by.PK === userPK)) {
                  if ('score' in score && score.score !== 'none') {
                    const caseControlEvidence = {};

                    const pubDate = annotation.article && (/^([\d]{4})(.*?)$/).exec(annotation.article.date);
                    // Define object key/value pairs
                    caseControlEvidence['earliestPub'] = gdmAnnotationIsEarliestPublication(lodashGet(currentGdm, "earliestPublications", null), annotation.PK);
                    caseControlEvidence['authors'] = annotation.article && annotation.article.authors;
                    caseControlEvidence['pmid'] = annotation.article && annotation.article.pmid;
                    caseControlEvidence['pubYear'] = pubDate && pubDate[1];
                    caseControlEvidence['label'] = caseControl.label ? caseControl.label : '';
                    caseControlEvidence['studyType'] = caseControl.studyType ? caseControl.studyType : '';
                    caseControlEvidence['detectionMethod'] = caseControl.caseCohort && caseControl.caseCohort.method
                      ? caseControl.caseCohort.method.specificMutationsGenotypedMethod : '';
                    caseControlEvidence['caseCohort_numberWithVariant'] = caseControl.caseCohort && typeof caseControl.caseCohort.numberWithVariant === 'number'
                      ? caseControl.caseCohort.numberWithVariant : null;
                    caseControlEvidence['caseCohort_numberAllGenotypedSequenced'] = caseControl.caseCohort && typeof caseControl.caseCohort.numberAllGenotypedSequenced === 'number'
                      ? caseControl.caseCohort.numberAllGenotypedSequenced : null;
                    caseControlEvidence['controlCohort_numberWithVariant'] = caseControl.controlCohort && typeof caseControl.controlCohort.numberWithVariant === 'number'
                      ? caseControl.controlCohort.numberWithVariant : null;
                    caseControlEvidence['controlCohort_numberAllGenotypedSequenced'] = caseControl.controlCohort && typeof caseControl.controlCohort.numberAllGenotypedSequenced === 'number'
                      ? caseControl.controlCohort.numberAllGenotypedSequenced : null;
                    caseControlEvidence['comments'] = caseControl.comments ? caseControl.comments : '';
                    caseControlEvidence['explanationForDifference'] = caseControl.explanationForDifference
                      ? caseControl.explanationForDifference : '';
                    caseControlEvidence['statisticValueType'] = caseControl.statisticalValues && caseControl.statisticalValues.length && caseControl.statisticalValues[0].valueType
                      ? caseControl.statisticalValues[0].valueType : '';
                    caseControlEvidence['statisticValueTypeOther'] = caseControl.statisticalValues && caseControl.statisticalValues.length && caseControl.statisticalValues[0].otherType
                      ? caseControl.statisticalValues[0].otherType : '';
                    caseControlEvidence['statisticValue'] = caseControl.statisticalValues && caseControl.statisticalValues.length && caseControl.statisticalValues[0].value
                      ? caseControl.statisticalValues[0].value : null;
                    caseControlEvidence['pValue'] = caseControl.pValue ? caseControl.pValue : null;
                    caseControlEvidence['confidenceIntervalFrom'] = caseControl.confidenceIntervalFrom ? caseControl.confidenceIntervalFrom : null;
                    caseControlEvidence['confidenceIntervalTo'] = caseControl.confidenceIntervalTo ? caseControl.confidenceIntervalTo : null;
                    caseControlEvidence['score'] = has(score, 'score') ? score.score : null;
                    if (caseControl.caseCohort && caseControl.caseCohort.commonDiagnosis && caseControl.caseCohort.commonDiagnosis.length) {
                      const disease = caseControl.caseCohort.commonDiagnosis[0];
                      caseControlEvidence['diseaseId'] = disease.diseaseId ? disease.diseaseId : null;
                      caseControlEvidence['diseaseTerm'] = disease.term ? disease.term : '';
                      caseControlEvidence['diseaseFreetext'] = has(disease, 'freetext') ? disease.freetext : false;
                      caseControlEvidence['diseasePhenotypes'] = disease.phenotypes && disease.phenotypes.length ? disease.phenotypes : [];
                      // Put object into array
                      caseControlEvidenceList.push(caseControlEvidence);
                      setCaseControlEvidence(caseControlEvidenceList);
                    } else {
                      caseControlEvidence['diseaseId'] = null;
                      caseControlEvidence['diseaseTerm'] = '';
                      caseControlEvidence['diseaseFreetext'] = false;
                      caseControlEvidence['diseasePhenotypes'] = [];
                      caseControlEvidence['termsInDiagnosis'] = caseControl.caseCohort && caseControl.caseCohort.termsInDiagnosis && caseControl.caseCohort.termsInDiagnosis.length
                        ? caseControl.caseCohort.termsInDiagnosis : '';
                      caseControlEvidence['hpoIdInDiagnosis'] = caseControl.caseCohort && caseControl.caseCohort.hpoIdInDiagnosis && caseControl.caseCohort.hpoIdInDiagnosis.length
                        ? caseControl.caseCohort.hpoIdInDiagnosis : [];
                      // Put object into array
                      caseControlEvidenceList.push(caseControlEvidence);
                      setCaseControlEvidence(caseControlEvidenceList);
                      hpoIds = hpoIds.concat(caseControlEvidence.hpoIdInDiagnosis);
                    }
                  }
                }
              });
            }
          });
        }
      });
    }
    return hpoIds;
  };

  /**
   * Method to find the scored experimental evidence (e.g. 'Score', 'Review' or 'Contradicts')
   * entries both created by the currently logged-in user or simply just scored by this user
   * @param {array} annotationsList - a list of annotations in a given gdm
   * @param {string} userPK - logged in user PK
   * @param {string} curatorffiliationPK - logged in user's associated affiliation PK
   */
  const parseExperimentalEvidence = (annotationsList, userPK, curatorAffiliationPK) => {
    const currentGdm = snapshotPK ? snapshotGdm : gdm;
    const experimentalEvidenceList = [];

    if (annotationsList.length) {
      annotationsList.forEach(annotation => {
        // Loop through experimentals
        const experimentals = annotation.experimentalData && annotation.experimentalData.length ? annotation.experimentalData : [];
        experimentals.forEach(experimental => {
          // Loop through scores, if any
          if (experimental.scores && experimental.scores.length) {
            experimental.scores.forEach(score => {
              const experimentalEvidence = {};
              // Only interested in the logged-in user's scores and their associated evidence
              if ((score.affiliation && curatorAffiliationPK && score.affiliation === curatorAffiliationPK)
                || (!score.affiliation && !curatorAffiliationPK && score.submitted_by.PK === userPK)) {
                if ('scoreStatus' in score && (score.scoreStatus !== 'none' || score.scoreStatus !== '')) {
                  const pubDate = (/^([\d]{4})(.*?)$/).exec(annotation.article.date);
                  // Define object key/value pairs
                  experimentalEvidence['label'] = experimental.label ? experimental.label : '';
                  experimentalEvidence['evidenceType'] = experimental.evidenceType;
                  experimentalEvidence['evidenceSubtype'] = mapEvidenceSubtype(experimental);
                  experimentalEvidence['earliestPub'] = gdmAnnotationIsEarliestPublication(lodashGet(currentGdm, "earliestPublications", null), annotation.PK);
                  experimentalEvidence['pmid'] = annotation.article.pmid;
                  experimentalEvidence['pubYear'] = pubDate[1];
                  experimentalEvidence['authors'] = annotation.article.authors;
                  experimentalEvidence['explanation'] = mapExperimentalEvidenceExplanation(experimental);
                  experimentalEvidence['scoreStatus'] = score.scoreStatus;
                  experimentalEvidence['defaultScore'] = score.calculatedScore;
                  experimentalEvidence['modifiedScore'] = has(score, 'score') ? score.score : null;
                  experimentalEvidence['scoreExplanation'] = score.scoreExplanation && score.scoreExplanation.length
                    ? score.scoreExplanation : '';
                  // Put object into array
                  experimentalEvidenceList.push(experimentalEvidence);
                  setExperimentalEvidence(experimentalEvidenceList);
                }
              }
            });
          }
        });
      });
    }
  };

  /**
   * Method to find the non-scorable evidence and corresponding notes
   * @param {array} annotationsList - a list of annotations in a given gdm
   */
  const parseNonscorableEvidence = (annotationsList) => {
    const currentGdm = snapshotPK ? snapshotGdm : gdm;
    const nonscorableEvidenceList = [];

    if (annotationsList.length) {
      annotationsList.forEach(annotation => {
        if (annotation.articleNotes && annotation.articleNotes.nonscorable.checked) {
          nonscorableEvidenceList.push({
            article: annotation.article,
            articleNotes: annotation.articleNotes,
            earliestPub: gdmAnnotationIsEarliestPublication(lodashGet(currentGdm, "earliestPublications", null), annotation.PK)
          });
        }
      });
    }
    setNonscorableEvidence(nonscorableEvidenceList);
  };

  const currentGdm = snapshotPK ? snapshotGdm : gdm;
  // From SOP8, scores are stored in individual.variantScores.
  // Before SOP8, scores are stored in individual.scores.
  const currentSOP = isPreview ? true
    : (snapshotPK && provisional && provisional.classificationPoints ? isScoringForCurrentSOP(provisional.classificationPoints) : null);

  return (
    <div className={`m-2 ${isPreview ? 'preview-only-overlay' : ''}`}>
      <div className="text-right">
        <Button
          variant="outline-dark"
          className="my-3 text-right"
          onClick={() => window.close()}
        >
          <i className="icon icon-close" /> Close
        </Button>
      </div>
      {!isPreview && !isEmpty(currentGdm) &&
        <GeneDiseaseEvidenceSummaryHeader
          gdm={currentGdm}
          provisional={provisional}
          snapshotPublishDate={snapshotPublishDate}
        />
      }
      {!isPreview && !isEmpty(provisional) &&
        <GeneDiseaseEvidenceSummaryClassificationMatrix
          isEvidenceSummary
          classification={provisional}
        />
      }
      {loading
        ? <LoadingSpinner className="my-4" />
        : (
          <>
            {isPreview || currentSOP
              ?
                <>
                <CaseLevelEvidenceProbandVariantsPanel
                  hpoTerms={hpoTermsCollection}
                  caseLevelEvidenceList={caseLevelEvidence}
                />
                <CaseLevelEvidenceProbandSegregationPanel
                  hpoTerms={hpoTermsCollection}
                  caseLevelEvidenceList={caseLevelEvidenceSegregation}
                />
                </>
              :
                <CaseLevelEvidencePanelSop7
                  hpoTerms={hpoTermsCollection}
                  caseLevelEvidenceList={caseLevelEvidence}
                />
            }
            <SegregationEvidencePanel
              hpoTerms={hpoTermsCollection}
              segregationEvidenceList={segregationEvidence}
            />
            <CaseControlEvidencePanel
              hpoTerms={hpoTermsCollection}
              caseControlEvidenceList={caseControlEvidence}
            />
            <ExperimentalEvidencePanel
              sopv8={isPreview || currentSOP}
              experimentalEvidenceList={experimentalEvidence}
            />
            <NonscorableEvidencePanel
              nonscorableEvidenceList={nonscorableEvidence}
            />
          </>
        )
      }
      <p className="print-info-note">
        <i className="icon icon-info-circle"></i> For best printing, choose &quot;Landscape&quot; for layout, 50% for Scale, &quot;Minimum&quot; for Margins, and select &quot;Background graphics&quot;.
      </p>
      <div className="pdf-download-wrapper">
        <Button
          variant="outline-dark"
          className="btn-inline-spacer"
          onClick={() => window.close()}
        >
          <i className="icon icon-close"></i> Close
        </Button>
        <Button
          variant="primary"
          className="btn-inline-spacer pull-right"
          onClick={() => window.print()}
        >
          Print PDF
        </Button>
      </div>
    </div>
  );
};

const mapStateToProps = (state) => ({
  gdm: state.gdm.entity,
  auth: state.auth,
  annotations: state.annotations
});

export default connect(mapStateToProps)(GeneDiseaseEvidenceSummary);
