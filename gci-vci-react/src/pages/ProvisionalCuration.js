import React, { Component } from 'react';
import { RestAPI as API } from '@aws-amplify/api-rest';
import { API_NAME } from '../utils';
import { connect } from 'react-redux';
import moment from 'moment';
import lodashGet from 'lodash/get';
import Input from "../components/common/Input";
import { Button, Container } from "react-bootstrap";
import MDEditor from "@uiw/react-md-editor";
import CardPanel from "../components/common/CardPanel";
import { GdmHeader } from '../components/gene-central/GdmHeader';
import { LoadingButton } from "../components/common/LoadingButton";
import Snapshots from '../components/provisional-classification/snapshots';
import { setGdmAction } from '../actions/gdmActions';
import { sortListByDate } from '../helpers/sort';
import { isScoringForCurrentSOP } from '../helpers/sop';
import { ContextualHelp } from '../helpers/contextual_help';
import { allowPublishGlobal } from '../helpers/allow_publish';
import { familyScraper, individualScraper } from '../helpers/provisional_helpers';
import { renderAnimalOnlyTag } from '../helpers/render_classification_animal_only_tag';
import { renderEarliestPublications } from '../helpers/renderEarliestPublications';
import { getClassificationSavedDate } from "../utilities/classificationUtilities";
import { gdmParticipantReducer } from '../utilities/gdmUtilities';
import { AmplifyAPIRequestRecycler, getDetailErrorMessageFromServerless } from '../utilities/fetchUtilities';
import { GdmClassificationRecords } from '../components/gene-central/GdmClassificationRecords';
import { AUTOSOMAL_RECESSIVE, SEMIDOMINANT } from '../components/gene-central/score/constants/evidenceTypes';
import { getModeInheritanceType, getScoreMOIString, getScoreUpperLimit } from '../components/gene-central/score/helpers/getDefaultScore';
import isHomozygousScore from '../components/gene-central/score/helpers/isHomozygousScore';


class ProvisionalCuration extends Component {
  constructor(props) {
    super(props);
    this.state = {
      user: null, // login user uuid
      gdm: null, // current gdm object, must be null initially.
      allowEdit: false, // current gdm object can be edited by current logged in user
      provisional: {}, // login user's existing provisional object, must be null initially.
      //assessments: null,  // list of all assessments, must be nul initially.
      totalScore: null,
      autoClassification: 'No Classification',
      alteredClassification: 'No Modification',
      replicatedOverTime: false,
      reasons: '',
      classificationStatus: 'In progress',
      classificationSnapshots: [],
      evidenceSummary: '',
      isSubmitting: false,
      formErrors: {},
      contradictingEvidence: {
        proband: false, caseControl: false, experimental: false
      },
      resetAlteredClassification: false,
      scoreTableValues: {
        // variables for autosomal dominant data
        probandPredictedOrProvenNullCount: 0,
        probandPredictedOrProvenNullProbandCount: 0,
        probandPredictedOrProvenNullPoints: 0,
        probandPredictedOrProvenNullPointsCounted: 0,
        probandOtherVariantTypeCount: 0,
        probandOtherVariantTypeProbandCount: 0,
        probandOtherVariantTypePoints: 0,
        probandOtherVariantTypePointsCounted: 0,
        probandPointsCounted: 0,
        // variables for autosomal recessive data
        autoRec_probandPredictedOrProvenNullCount: 0,
        autoRec_probandPredictedOrProvenNullPoints: 0,
        autoRec_probandPredictedOrProvenNullPointsCounted: 0,
        autoRec_probandOtherVariantTypeCount: 0,
        autoRec_probandOtherVariantTypePoints: 0,
        autoRec_probandOtherVariantTypePointsCounted: 0,
        autosomalRecessiveProbandCount: 0,
        autosomalRecessivePoints: 0,
        autosomalRecessivePointsCounted: 0,
        // variables for segregation data
        // segregationTotalPoints is actually the raw, unconverted score; segregationPointsCounted is calculated and displayed score
        segregationCountCandidate: 0, segregationCountExome: 0, segregationCountTotal: 0,
        segregationPointsCandidate: 0, segregationPointsExome: 0,
        segregationTotalPoints: 0, segregationPointsCounted: 0,
        // variables for case-control data
        caseControlCount: 0, caseControlPoints: 0, caseControlPointsCounted: 0,
        // variables for Experimental data
        functionalPointsCounted: 0, functionalAlterationPointsCounted: 0, modelsRescuePointsCounted: 0,
        biochemicalFunctionCount: 0, biochemicalFunctionPoints: 0,
        proteinInteractionsCount: 0, proteinInteractionsPoints: 0,
        expressionCount: 0, expressionPoints: 0,
        patientCellsCount: 0, patientCellsPoints: 0,
        nonPatientCellsCount: 0, nonPatientCellsPoints: 0,
        nonHumanModelCount: 0, nonHumanModelPoints: 0,
        cellCultureCount: 0, cellCulturePoints: 0,
        rescueHumanModelCount: 0, rescueHumanModelPoints: 0,
        rescueNonHumanModelCount: 0, rescueNonHumanModelPoints: 0,
        rescueCellCultureCount: 0, rescueCellCulturePoints: 0,
        rescuePatientCellsCount: 0, rescuePatientCellsPoints: 0,
        // variables for total counts
        geneticEvidenceTotalPoints: 0, experimentalEvidenceTotalPoints: 0
      },
      earliestPubList: null
    }
    this.loadData = this.loadData.bind(this);
    this.submitForm = this.submitForm.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleSummaryChange = this.handleSummaryChange.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
    this.setFormErrors = this.setFormErrors.bind(this);
    this.handleReplicatedOverTime = this.handleReplicatedOverTime.bind(this);
    this.calculateClassifications = this.calculateClassifications.bind(this);
    this.requestRecycler = new AmplifyAPIRequestRecycler();
  }

  /**
   * Method to get a list of snapshots of a classification, either provisioned or approved,
   * given the matching of the classificaiton object.
   * Called only once in the componentDidMount() lifecycle method via the loadData() method.
   * @param {object} provisional - saved classification object
   */
  async getClassificationSnapshots(provisional) {
    let snapshots = [];
    if (provisional && provisional.associatedClassificationSnapshots && provisional.associatedClassificationSnapshots.length) {
      for (let classificationSnapshot of provisional.associatedClassificationSnapshots) {
        let snapshot;
        if (classificationSnapshot && typeof classificationSnapshot === 'object' && classificationSnapshot.resource) {
          snapshot = classificationSnapshot;
        } else {
          let snapshotPK = classificationSnapshot.uuid ? classificationSnapshot.uuid : classificationSnapshot;
          try {
            snapshot = await API.get(API_NAME, '/snapshots/' + snapshotPK);
          } catch (error) {
            if (API.isCancel(error)) {
              return;
            }
            console.error(error);
          }
        }

        if (snapshot) {
          snapshots.push(snapshot);
        }
      }
    }
    if (snapshots && snapshots.length) {
      this.setState({ classificationSnapshots: snapshots });
    }
  }

  async loadData() {
    if (this.props.gdm) {
      const gdm = this.props.gdm;
      this.setState({ gdm: gdm });
      // Find the earliest publications list
      if (gdm.earliestPublications && gdm.earliestPublications.length) {
        const annotations = this.props.annotations ? this.props.annotations.byPK : [];
        const annotationsArray = Object.keys(annotations).map(key => annotations[key]);
        let earliestPubs = [];
        if (annotationsArray.length) {
          for (let i = 0; i < gdm.earliestPublications.length; i++) {
            const found = annotationsArray.filter(item => {
              return item.PK === gdm.earliestPublications[i]
            });
            if (found && found.length) {
              earliestPubs.push(found[0].article);
            }
          }
          this.setState({ earliestPubList: earliestPubs.length ? earliestPubs : null });
        }
      }

      const getProvisionalClassifications = async () => {
        const provisionalClassifications = [];
        if (gdm.provisionalClassifications && gdm.provisionalClassifications.length) {
          for (let i = 0; i < gdm.provisionalClassifications.length; i++) {
            const res = await API.get(API_NAME, `/provisional-classifications/${gdm.provisionalClassifications[i].PK}`);
            provisionalClassifications.push(res);
          }
        }
        return provisionalClassifications;
      }

      const provisionalClassifications = await getProvisionalClassifications();

      let stateObj = {};
      stateObj.user = this.props.auth.PK;
      const gdmAffiliation = this.props.gdm.affiliation;
      const curatorAffiliation = this.props.auth.currentAffiliation;
      // search for provisional owned by gdm affiliation or owner
      if (provisionalClassifications && provisionalClassifications.length > 0) {
        for (let provisionalClassification of provisionalClassifications) {
          let affiliation = provisionalClassification.affiliation ? provisionalClassification.affiliation : null;
          let creator = provisionalClassification.submitted_by;
          if ((affiliation && gdmAffiliation && affiliation === gdmAffiliation) || (!affiliation && !gdmAffiliation && creator === stateObj.user)) {
            stateObj.provisional = provisionalClassification;
            stateObj.alteredClassification = stateObj.provisional.alteredClassification;
            stateObj.replicatedOverTime = stateObj.provisional.replicatedOverTime;
            stateObj.reasons = stateObj.provisional.reasons;
            stateObj.classificationStatus = stateObj.provisional.classificationStatus ? stateObj.provisional.classificationStatus : 'In progress';
            stateObj.evidenceSummary = stateObj.provisional.evidenceSummary ? stateObj.provisional.evidenceSummary : '';
          }
        }
        this.setState(stateObj);
        if (stateObj.provisional && stateObj.provisional.PK) {
          this.getClassificationSnapshots(stateObj.provisional);
        }
      }
      // Set if current curator can edit this GDM.  GDM needs to associated with a GCEP and user has to login as same GCEP in order to act on the GDM.
      if (gdmAffiliation && curatorAffiliation && gdmAffiliation === curatorAffiliation.affiliation_id) {
        this.setState({ allowEdit: true });
      }
    }
    this.calculateScoreTable();
  }

  componentDidMount() {
    this.loadData();
  }

  componentWillUnmount() {
    this.setState({ resetAlteredClassification: false });
  }

  /**
   * Simple Math.round method
   * alternative #1 - Math.round(num * 10) / 10; //*** returns 1 decimal
   * alternative #2 - Math.round((num + 0.00001) * 100) / 100; //*** returns 2 decimals
   */
  classificationMathRound(number, decimals) {
    return Number(Math.round(number + ('e' + decimals)) + ('e-' + decimals));
  }

  calculateScoreTable() {
    // Generate a new summary for url ../provisional-curation/?gdm=GDMId&calculate=yes
    // Calculation rules are defined by Small GCWG. See ClinGen_Interface_4_2015.pptx and Clinical Validity Classifications for detail
    let scoreTableValues = this.state.scoreTableValues;
    let contradictingEvidence = this.state.contradictingEvidence;
    let curatorAffiliation = this.props.auth.currentAffiliation ? this.props.auth.currentAffiliation.affiliation_id : null;

    const MAX_SCORE_CONSTANTS = {
      CASE_LEVEL: 12,
      SEGREGATION: 3,
      CASE_CONTROL: 12,
      FUNCTIONAL: 2,
      FUNCTIONAL_ALTERATION: 2,
      MODELS_RESCUE: 4,
      GENETIC_EVIDENCE: 12,
      EXPERIMENTAL_EVIDENCE: 6,
      TOTAL: 18
    };

    /*****************************************************/
    /* Find all proband individuals that had been scored */
    /*****************************************************/
    let probandTotal = []; // all probands
    let tempFamilyScraperValues = {};

    let annotations = this.props.annotations ? this.props.annotations.byPK : [];
    const annotationsArray = Object.keys(annotations).map(key => annotations[key]);
    annotationsArray.forEach(annotation => {
      let groups, families, experimentals;
      let individualMatched = [];

      // loop through groups
      groups = annotation.groups && annotation.groups.length ? annotation.groups : [];
      groups.forEach(group => {
        // loop through families using FamilyScraper
        families = group.familyIncluded && group.familyIncluded.length ? group.familyIncluded : [];
        tempFamilyScraperValues = familyScraper(this.state.user, families, curatorAffiliation, annotation, scoreTableValues['segregationCountCandidate'],
          scoreTableValues['segregationCountExome'], scoreTableValues['segregationPointsCandidate'], scoreTableValues['segregationPointsExome'], individualMatched);
        scoreTableValues['segregationCountCandidate'] = tempFamilyScraperValues['segregationCountCandidate'];
        scoreTableValues['segregationCountExome'] = tempFamilyScraperValues['segregationCountExome'];
        scoreTableValues['segregationPointsCandidate'] = tempFamilyScraperValues['segregationPointsCandidate'];
        scoreTableValues['segregationPointsExome'] = tempFamilyScraperValues['segregationPointsExome'];
        individualMatched = tempFamilyScraperValues['individualMatched'];
        // get proband individuals of group
        if (group.individualIncluded && group.individualIncluded.length) {
          individualMatched = individualScraper(group.individualIncluded, individualMatched);
        }
      });

      // loop through families using FamilyScraper
      families = annotation.families && annotation.families.length ? annotation.families : [];
      tempFamilyScraperValues = familyScraper(this.state.user, families, curatorAffiliation, annotation, scoreTableValues['segregationCountCandidate'],
        scoreTableValues['segregationCountExome'], scoreTableValues['segregationPointsCandidate'], scoreTableValues['segregationPointsExome'], individualMatched);
      scoreTableValues['segregationCountCandidate'] = tempFamilyScraperValues['segregationCountCandidate'];
      scoreTableValues['segregationCountExome'] = tempFamilyScraperValues['segregationCountExome'];
      scoreTableValues['segregationPointsCandidate'] = tempFamilyScraperValues['segregationPointsCandidate'];
      scoreTableValues['segregationPointsExome'] = tempFamilyScraperValues['segregationPointsExome'];
      individualMatched = tempFamilyScraperValues['individualMatched'];

      // push all matched individuals from families and families of groups to probandTotal
      individualMatched.forEach(item => {
        probandTotal.push(item);
      });

      // loop through individuals
      if (annotation.individuals && annotation.individuals.length) {
        // get proband individuals
        individualMatched = [];
        individualMatched = individualScraper(annotation.individuals, individualMatched);
        // push all matched individuals to probandTotal
        individualMatched.forEach(item => {
          probandTotal.push(item);
        });
      }

      // loop through case-controls
      if (annotation.caseControlStudies && annotation.caseControlStudies.length) {
        annotation.caseControlStudies.forEach(caseControl => {
          if (caseControl.scores && caseControl.scores.length) {
            caseControl.scores.forEach(score => {
              if ((score.affiliation && curatorAffiliation && score.affiliation === curatorAffiliation)
                || (!score.affiliation && !curatorAffiliation && score.submitted_by.PK === this.state.user)) {
                if ('score' in score && score.score !== 'none') {
                  scoreTableValues['caseControlCount'] += 1;
                  scoreTableValues['caseControlPoints'] += parseFloat(score.score);
                }
              }
            });
          }
        });
      }

      // loop through experimentals
      experimentals = annotation.experimentalData && annotation.experimentalData.length ? annotation.experimentalData : [];
      experimentals.forEach(experimental => {
        // loop through scores, if any
        if (experimental.scores && experimental.scores.length) {
          experimental.scores.forEach(score => {
            // only care about scores made by current user
            if ((score.affiliation && curatorAffiliation && score.affiliation === curatorAffiliation)
              || (!score.affiliation && !curatorAffiliation && score.submitted_by.PK === this.state.user)) {
              if (score.scoreStatus === 'Score') {
                // parse score of experimental
                let experimentalScore = 0;
                if ('score' in score && score.score !== 'none') {
                  experimentalScore = parseFloat(score.score); // Use the score selected by curator (if any)
                } else if ('calculatedScore' in score && score.calculatedScore !== 'none') {
                  experimentalScore = parseFloat(score.calculatedScore); // Otherwise, use default score (if any)
                }

                // assign score to correct sub-type depending on experiment type and other variables
                if (experimental.evidenceType && experimental.evidenceType === 'Biochemical Function') {
                  scoreTableValues['biochemicalFunctionCount'] += 1;
                  scoreTableValues['biochemicalFunctionPoints'] += experimentalScore;
                } else if (experimental.evidenceType && experimental.evidenceType === 'Protein Interactions') {
                  scoreTableValues['proteinInteractionsCount'] += 1;
                  scoreTableValues['proteinInteractionsPoints'] += experimentalScore;
                } else if (experimental.evidenceType && experimental.evidenceType === 'Expression') {
                  scoreTableValues['expressionCount'] += 1;
                  scoreTableValues['expressionPoints'] += experimentalScore;
                } else if (experimental.evidenceType && experimental.evidenceType === 'Functional Alteration') {
                  if (experimental.functionalAlteration.functionalAlterationType
                    && experimental.functionalAlteration.functionalAlterationType === 'Patient cells') {
                    scoreTableValues['patientCellsCount'] += 1;
                    scoreTableValues['patientCellsPoints'] += experimentalScore;
                  } else if (experimental.functionalAlteration.functionalAlterationType
                    && experimental.functionalAlteration.functionalAlterationType === 'Non-patient cells') {
                    scoreTableValues['nonPatientCellsCount'] += 1;
                    scoreTableValues['nonPatientCellsPoints'] += experimentalScore;
                  }
                } else if (experimental.evidenceType && experimental.evidenceType === 'Model Systems') {
                  if (experimental.modelSystems.modelSystemsType
                    && experimental.modelSystems.modelSystemsType === 'Non-human model organism') {
                    scoreTableValues['nonHumanModelCount'] += 1;
                    scoreTableValues['nonHumanModelPoints'] += experimentalScore;
                  } else if (experimental.modelSystems.modelSystemsType
                    && experimental.modelSystems.modelSystemsType === 'Cell culture model') {
                    scoreTableValues['cellCultureCount'] += 1;
                    scoreTableValues['cellCulturePoints'] += experimentalScore;
                  }
                } else if (experimental.evidenceType && experimental.evidenceType === 'Rescue') {
                  if (experimental.rescue.rescueType
                    && experimental.rescue.rescueType === 'Human') {
                    scoreTableValues['rescueHumanModelCount'] += 1;
                    scoreTableValues['rescueHumanModelPoints'] += experimentalScore;
                  } else if (experimental.rescue.rescueType
                    && experimental.rescue.rescueType === 'Non-human model organism') {
                    scoreTableValues['rescueNonHumanModelCount'] += 1;
                    scoreTableValues['rescueNonHumanModelPoints'] += experimentalScore;
                  } else if (experimental.rescue.rescueType
                    && experimental.rescue.rescueType === 'Cell culture model') {
                    scoreTableValues['rescueCellCultureCount'] += 1;
                    scoreTableValues['rescueCellCulturePoints'] += experimentalScore;
                  } else if (experimental.rescue.rescueType
                    && experimental.rescue.rescueType === 'Patient cells') {
                    scoreTableValues['rescuePatientCellsCount'] += 1;
                    scoreTableValues['rescuePatientCellsPoints'] += experimentalScore;
                  }
                }
              } else if (score.scoreStatus === 'Contradicts') {
                // set flag if a contradicting experimental evidence is found
                contradictingEvidence.experimental = true;
              }
            }
          });
        }
      });
    });

    const moiType = this.state.gdm && this.state.gdm.modeInheritance ? getModeInheritanceType(this.state.gdm.modeInheritance) : '';
    const autoRec = moiType === AUTOSOMAL_RECESSIVE;
    const semiDom = moiType === SEMIDOMINANT;
    // scan probands
    probandTotal.forEach(proband => {
      // For semiDom, if probandIs is "Monoallelic heterozygous" or "Hemizygous" then AUTOSOMAL_DOMINANT
      // If "Biallelic homozygous" or "Biallelic compound heterozygous" then AUTOSOMAL_RECESSIVE
      const fieldPrefix = autoRec || (semiDom && proband.probandIs.indexOf("Biallelic") > -1) ? "autoRec_" : "";
      // If autoRec and homozygous or if semiDom and probandIs = Biallelic .. => AR, and Homozygous, variant is counted twice
      // If autoRec and homozygous or
      // if semiDom and probandIs = Biallelic homozygous => autoRec and homozygous or
      // if semiDom and probandIs = Biallelic compound heterozygous => autoRec and homozygous is checked
      // then variant is counted/shown twice
      const doubleCount = isHomozygousScore(moiType, proband.recessiveZygosity, proband.probandIs);
      // If has more than 1 score, check if total of both scores has limit
      let totalLimit = 0;
      if (doubleCount ||
        (proband.variantScores.length > 1 &&
        proband.variantScores[0].variantType === proband.variantScores[1].variantType &&
        proband.variantScores[0].functionalDataSupport === proband.variantScores[1].functionalDataSupport &&
        proband.variantScores[0].deNovo === proband.variantScores[1].deNovo)) {
        totalLimit = getScoreUpperLimit(getScoreMOIString(moiType, proband.probandIs), proband.variantScores[0]);
      }
      let predPoints = 0;
      let otherPoints = 0;
      let lastVariant = "";
      let added = false;
      proband.variantScores.forEach(score => {
        if ((score.affiliation && curatorAffiliation && score.affiliation === curatorAffiliation)
          || (!score.affiliation && !curatorAffiliation && score.submitted_by.PK === this.state.user)) {
          if (score.scoreStatus === 'Score') {
            // parse proband score
            let probandScore = 0;
            if ('score' in score && score.score !== 'none') {
              probandScore += parseFloat(score.score);
            } else if ('calculatedScore' in score && score.calculatedScore !== 'none') {
              probandScore += parseFloat(score.calculatedScore);
            }
            // assign score to correct sub-type depending on variant type
            if (score.variantType && score.variantType === 'PREDICTED_OR_PROVEN_NULL') {
              scoreTableValues[fieldPrefix + 'probandPredictedOrProvenNullCount'] += 1;
              if (doubleCount) {
                scoreTableValues[fieldPrefix + 'probandPredictedOrProvenNullCount'] += 1;
              }
              // Seperate proband count for AD/XL only
              if (fieldPrefix === "" && (lastVariant === "" || lastVariant !== score.variantType)) {
                scoreTableValues['probandPredictedOrProvenNullProbandCount'] += 1;
                lastVariant = lastVariant === "" ? score.variantType : lastVariant;
              }
              // Add up Predicted or proven null variant points for this proband
              predPoints += probandScore;
              if (doubleCount) {
                predPoints += probandScore;
              }
            } else if (score.variantType && score.variantType === 'OTHER_VARIANT_TYPE') {
              scoreTableValues[fieldPrefix + 'probandOtherVariantTypeCount'] += 1;
              if (doubleCount) {
                scoreTableValues[fieldPrefix + 'probandOtherVariantTypeCount'] += 1;
              }
              // Seperate proband count for AD/XL only
              if (fieldPrefix === "" && (lastVariant === "" || lastVariant !== score.variantType)) {
                scoreTableValues[fieldPrefix + 'probandOtherVariantTypeProbandCount'] += 1;
                lastVariant = lastVariant === "" ? score.variantType : lastVariant;
              }
              // Add up Other variant type points for this proband
              otherPoints += probandScore;
              if (doubleCount) {
                otherPoints += probandScore;
              }
            }
            // Add proband count for autoRec evidence type
            if (fieldPrefix === "autoRec_" && !added) {
              scoreTableValues['autosomalRecessiveProbandCount'] += 1;
              added = true;
            }
          } else if (score.scoreStatus === 'Contradicts') {
            // set flag if a contradicting proband evidence is found
            contradictingEvidence.proband = true;
          }
        }
      });
      // Add this proband total points and points counted to variant type totals
      // total points - just add all the modified/calculated points
      // points counted - check only add up to max/limit if there is a totalLimit
      scoreTableValues[fieldPrefix + 'probandPredictedOrProvenNullPoints'] = this.classificationMathRound(scoreTableValues[fieldPrefix + 'probandPredictedOrProvenNullPoints'] + predPoints, 2);
      scoreTableValues[fieldPrefix + 'probandPredictedOrProvenNullPointsCounted'] = this.classificationMathRound(
        scoreTableValues[fieldPrefix + 'probandPredictedOrProvenNullPointsCounted'] + (totalLimit && totalLimit < predPoints ? totalLimit : predPoints), 2);
      scoreTableValues[fieldPrefix + 'probandOtherVariantTypePoints'] =
        this.classificationMathRound(scoreTableValues[fieldPrefix + 'probandOtherVariantTypePoints'] + otherPoints, 2);
      scoreTableValues[fieldPrefix + 'probandOtherVariantTypePointsCounted'] = this.classificationMathRound(
        scoreTableValues[fieldPrefix + 'probandOtherVariantTypePointsCounted'] + (totalLimit && totalLimit < otherPoints ? totalLimit : otherPoints), 2);
    });

    // calculate segregation counted points
    scoreTableValues['segregationCountTotal'] = scoreTableValues['segregationCountCandidate'] + scoreTableValues['segregationCountExome'];
    // Total LOD scores is calculated from the sum of all LOD scores from both sequencing methods
    scoreTableValues['segregationTotalPoints'] = (scoreTableValues['segregationPointsCandidate'] + scoreTableValues['segregationPointsExome']);
    // Determine the min points (Candidate gene sequencing) and max points (Exome/genome or all genes sequenced in linkage region) given the total LOD scores
    let range = { min: 0, max: 0 };
    if (scoreTableValues['segregationTotalPoints'] >= 0 && scoreTableValues['segregationTotalPoints'] <= 1.99) {
      range = { min: 0, max: 0 };
    } else if (scoreTableValues['segregationTotalPoints'] >= 2 && scoreTableValues['segregationTotalPoints'] <= 2.99) {
      range = { min: 0.5, max: 1 };
    } else if (scoreTableValues['segregationTotalPoints'] >= 3 && scoreTableValues['segregationTotalPoints'] <= 4.99) {
      range = { min: 1, max: 2 };
    } else if (scoreTableValues['segregationTotalPoints'] >= 5) {
      range = { min: 1.5, max: 3 };
    }
    // Determine the 'awarded' exome points given the total exome LOD score
    let awardedExomePoints = 0;
    if (scoreTableValues['segregationPointsExome'] >= 0 && scoreTableValues['segregationPointsExome'] <= 1.99) {
      awardedExomePoints = 0;
    } else if (scoreTableValues['segregationPointsExome'] >= 2 && scoreTableValues['segregationPointsExome'] <= 2.99) {
      awardedExomePoints = 1;
    } else if (scoreTableValues['segregationPointsExome'] >= 3 && scoreTableValues['segregationPointsExome'] <= 4.99) {
      awardedExomePoints = 2;
    } else if (scoreTableValues['segregationTotalPoints'] >= 5) {
      awardedExomePoints = 3;
    }
    // Calculate the segregation points counted given total LOD scores, min points and max points
    let calculatedSegregationScore = scoreTableValues['segregationTotalPoints'] === parseFloat(0) ?
      parseFloat(0)
      :
      ((scoreTableValues['segregationPointsCandidate'] / scoreTableValues['segregationTotalPoints']) * range['min']) +
      ((scoreTableValues['segregationPointsExome'] / scoreTableValues['segregationTotalPoints']) * range['max']);
    // Determine which score to use - the calculated or the awarded Exome, given the total Exome LOD score range (e.g. 3 - 4.99)
    // Example 1 - total Exome LOD score = 3.1, awarded Exome points = 2, calculated score = 1.720930233, then final score = 2
    // Example 2 - total Exome LOD score = 2, awarded Exome points = 1, calculated score = 1.891644909, then final score = 1.9 (rounded to nearest 0.1)
    if (calculatedSegregationScore !== parseFloat(0) && scoreTableValues['segregationPointsExome'] !== parseFloat(0)) {
      scoreTableValues['segregationPointsCounted'] = awardedExomePoints >= calculatedSegregationScore ? awardedExomePoints : this.classificationMathRound(calculatedSegregationScore, 1);
    } else {
      scoreTableValues['segregationPointsCounted'] = this.classificationMathRound(calculatedSegregationScore, 1);
    }

    // calculate other counted points
    let tempPoints = 0;

    scoreTableValues['probandPredictedOrProvenNullPoints'] = this.classificationMathRound(scoreTableValues['probandPredictedOrProvenNullPoints'], 2);
    scoreTableValues['probandOtherVariantTypePoints'] = this.classificationMathRound(scoreTableValues['probandOtherVariantTypePoints'], 2);
    scoreTableValues['probandPointsCounted'] =
      scoreTableValues['probandPredictedOrProvenNullPointsCounted'] +
      scoreTableValues['probandOtherVariantTypePointsCounted'] < MAX_SCORE_CONSTANTS.CASE_LEVEL
      ? scoreTableValues['probandPredictedOrProvenNullPointsCounted'] + scoreTableValues['probandOtherVariantTypePointsCounted']
      : MAX_SCORE_CONSTANTS.CASE_LEVEL;

    scoreTableValues['autoRec_probandPredictedOrProvenNullPoints'] = this.classificationMathRound(scoreTableValues['autoRec_probandPredictedOrProvenNullPoints'], 2);
    scoreTableValues['autoRec_probandOtherVariantTypePoints'] = this.classificationMathRound(scoreTableValues['autoRec_probandOtherVariantTypePoints'], 2);
    scoreTableValues['autosomalRecessivePoints'] = scoreTableValues['autoRec_probandPredictedOrProvenNullPoints'] + scoreTableValues['autoRec_probandOtherVariantTypePoints'];
    scoreTableValues['autosomalRecessivePointsCounted'] =
      scoreTableValues['autoRec_probandPredictedOrProvenNullPointsCounted'] +
      scoreTableValues['autoRec_probandOtherVariantTypePointsCounted'] < MAX_SCORE_CONSTANTS.CASE_LEVEL
      ? scoreTableValues['autoRec_probandPredictedOrProvenNullPointsCounted'] + scoreTableValues['autoRec_probandOtherVariantTypePointsCounted']
      : MAX_SCORE_CONSTANTS.CASE_LEVEL;

    scoreTableValues['caseControlPointsCounted'] = scoreTableValues['caseControlPoints'] < MAX_SCORE_CONSTANTS.CASE_CONTROL ? scoreTableValues['caseControlPoints'] : MAX_SCORE_CONSTANTS.CASE_CONTROL;

    tempPoints = scoreTableValues['biochemicalFunctionPoints'] + scoreTableValues['proteinInteractionsPoints'] + scoreTableValues['expressionPoints'];
    scoreTableValues['functionalPointsCounted'] = tempPoints < MAX_SCORE_CONSTANTS.FUNCTIONAL ? tempPoints : MAX_SCORE_CONSTANTS.FUNCTIONAL;

    tempPoints = scoreTableValues['patientCellsPoints'] + scoreTableValues['nonPatientCellsPoints'];
    scoreTableValues['functionalAlterationPointsCounted'] = tempPoints < MAX_SCORE_CONSTANTS.FUNCTIONAL_ALTERATION ? tempPoints : MAX_SCORE_CONSTANTS.FUNCTIONAL_ALTERATION;

    tempPoints = scoreTableValues['nonHumanModelPoints'] + scoreTableValues['cellCulturePoints'] + scoreTableValues['rescueHumanModelPoints'] + scoreTableValues['rescueNonHumanModelPoints']
      + scoreTableValues['rescueCellCulturePoints'] + scoreTableValues['rescuePatientCellsPoints'];
    scoreTableValues['modelsRescuePointsCounted'] = tempPoints < MAX_SCORE_CONSTANTS.MODELS_RESCUE ? tempPoints : MAX_SCORE_CONSTANTS.MODELS_RESCUE;

    tempPoints = scoreTableValues['probandPointsCounted'] +
      scoreTableValues['autosomalRecessivePointsCounted'] +
      scoreTableValues['segregationPointsCounted'] +
      scoreTableValues['caseControlPointsCounted'];
    scoreTableValues['geneticEvidenceTotalPoints'] = tempPoints < MAX_SCORE_CONSTANTS.GENETIC_EVIDENCE ? this.classificationMathRound(tempPoints, 2) : MAX_SCORE_CONSTANTS.GENETIC_EVIDENCE;

    tempPoints = scoreTableValues['functionalPointsCounted'] + scoreTableValues['functionalAlterationPointsCounted'] + scoreTableValues['modelsRescuePointsCounted'];
    scoreTableValues['experimentalEvidenceTotalPoints'] = tempPoints < MAX_SCORE_CONSTANTS.EXPERIMENTAL_EVIDENCE ? this.classificationMathRound(tempPoints, 2) : MAX_SCORE_CONSTANTS.EXPERIMENTAL_EVIDENCE;

    let totalScore = scoreTableValues['geneticEvidenceTotalPoints'] + scoreTableValues['experimentalEvidenceTotalPoints'];
    // set scoreTabValues state
    this.setState({ totalScore: this.classificationMathRound(totalScore, 2), contradictingEvidence: contradictingEvidence, scoreTableValues: scoreTableValues });
    // set classification
    this.calculateClassifications(totalScore, scoreTableValues['geneticEvidenceTotalPoints'], contradictingEvidence, this.state.replicatedOverTime);
  }

  calculateClassifications(totalPoints, geneticEvidencePoints, contradictingEvidence, replicatedOverTime) {
    let autoClassification = "No Classification";
    // If no scored genetic evidence and no contradicting evidence, calculated classification should be "No Known Disease Relationship"
    if (geneticEvidencePoints === 0 &&
      !contradictingEvidence.caseControl &&
      !contradictingEvidence.experimental &&
      !contradictingEvidence.proband) {
      autoClassification = "No Known Disease Relationship";
    }
    else if (totalPoints >= 0.1 && totalPoints <= 6) {
      autoClassification = "Limited";
    } else if (totalPoints > 6 && totalPoints <= 11) {
      autoClassification = "Moderate";
    } else if (totalPoints > 11 && totalPoints <= 18 && !replicatedOverTime) {
      autoClassification = "Strong";
    } else if (totalPoints > 11 && totalPoints <= 18 && replicatedOverTime) {
      autoClassification = "Definitive";
    }
    this.setState({ autoClassification: autoClassification }, () => {
      // Reset modified classification state to 'No Modification'
      // if the new and current calculated classification is the same
      if (this.state.alteredClassification === this.state.autoClassification) {
        this.setState({
          alteredClassification: 'No Modification',
          resetAlteredClassification: true
        });
      }
    });
  }

  handleReplicatedOverTime() {
    let replicatedOverTime = this.state.replicatedOverTime;
    if (!replicatedOverTime) {
      replicatedOverTime = true;
    } else {
      replicatedOverTime = false;
    }
    this.setState({ replicatedOverTime: replicatedOverTime },
      this.calculateClassifications(this.state.totalScore, this.state.scoreTableValues['geneticEvidenceTotalPoints'], this.state.contradictingEvidence, replicatedOverTime));
  }

  setFormErrors(field, errorMsg) {
    let formErrors = this.state.formErrors;
    formErrors[field] = errorMsg;
    this.setState({ formErrors });
  }

  handleChange(e) {
    if (e.target.name === 'alteredClassification') {
      this.setState({ alteredClassification: e.target.value, resetAlteredClassification: false });
      if (this.state.formErrors['alteredClassification']) {
        this.setState({ formErrors: {} });
      }
    } else if (e.target.name === 'reasons') {
      this.setState({ reasons: e.target.value });
      if (this.state.formErrors['reasons']) {
        this.setState({ formErrors: {} });
      }
    }
  }

  handleSummaryChange(value) {
    this.setState({ evidenceSummary: value });
    if (this.state.formErrors['classification-evidence-summary']) {
      this.setState({ formErrors: {} });
    }
  }

  handleCancel() {
    this.requestRecycler.cancelAll();
    this.setState({ isSubmitting: false });
    this.props.history.go(-1);
  }

  async addProvisional(newProvisional) {
    const gdm = this.state.gdm && this.state.gdm.PK ? this.state.gdm : null
    const isNew = newProvisional.PK ? false : true;
    let provisionalResult;

    const postOrPutRequestArgs = [
      API_NAME,
      isNew
        ? "/provisional-classifications"
        : `/provisional-classifications/${newProvisional.PK}`,
      { body: { newProvisional } }
    ];

    try {
      provisionalResult = (isNew
        ? await this.requestRecycler.capture(API.post(...postOrPutRequestArgs))
        : await this.requestRecycler.capture(API.put(...postOrPutRequestArgs)));
    } catch (error) {
      if (API.isCancel(error)) {
        return;
      }
      throw new Error(
        "Failed to update or create new provisionalClassification"
      );
    }

    // If provisional has been added/updated, update gdm object
    if (provisionalResult && gdm) {
      let provisionalClassifications = gdm.provisionalClassifications || [];
      // If new provisional classification, add to gdm
      if (isNew) {
        provisionalClassifications = [...(gdm.provisionalClassifications || []), provisionalResult.PK];
      }
      const updateGdm = {
        ...gdm,
        provisionalClassifications,
        ...gdmParticipantReducer(gdm, this.props.auth)
      };
      // PUT gdm
      let putGdmResult;
      try {
        putGdmResult = await this.requestRecycler.capture(
          API.put(API_NAME, `/gdms/${gdm.PK}`, { body: { updateGdm } })
        );
      } catch (error) {
        if (error) {
          throw new Error(
            getDetailErrorMessageFromServerless(
              "Failed to append provisionalClassification to GDM",
              error
            )
          );
        }
      }
      this.props.setGdmAction(putGdmResult);
      this.props.history.push(`/provisional-classification/${gdm.PK}`);
    }
  }

  submitForm(e) {
    e.preventDefault(); e.stopPropagation();

    let newProvisional = this.state.provisional.PK ? this.state.provisional : {};

    newProvisional.autoClassification = this.state.autoClassification;
    newProvisional.alteredClassification = this.state.alteredClassification;
    newProvisional.reasons = this.state.reasons || null;
    newProvisional.replicatedOverTime = this.state.replicatedOverTime;
    newProvisional.contradictingEvidence = this.state.contradictingEvidence;
    newProvisional.classificationStatus = 'In progress';
    newProvisional.classificationDate = moment().toISOString();
    newProvisional.provisionedClassification = false;
    newProvisional.submitted_by = (newProvisional.submitted_by && newProvisional.submitted_by.PK)
      ? newProvisional.submitted_by.PK
      : lodashGet(this.props.auth, "PK", null);
    newProvisional.modified_by = lodashGet(this.props.auth, "PK", null);
    newProvisional.affiliation = this.props.auth.currentAffiliation ? this.props.auth.currentAffiliation.affiliation_id : null;
    if (newProvisional.provisionalSubmitter) newProvisional.provisionalSubmitter = null;
    if (newProvisional.provisionalDate) newProvisional.provisionalDate = null
    if (newProvisional.provisionalReviewDate) newProvisional.provisionalReviewDate = null
    if (newProvisional.provisionalComment) newProvisional.provisionalComment = null
    newProvisional.approvedClassification = false;
    if (newProvisional.approvalSubmitter) newProvisional.approvalSubmitter = null;
    if (newProvisional.classificationApprover) newProvisional.classificationApprover = null;
    if (newProvisional.classificationContributors) newProvisional.classificationContributors = null;
    if (newProvisional.additionalApprover) newProvisional.additionalApprover = null;
    if (newProvisional.approvalDate) newProvisional.approvalDate = null;
    if (newProvisional.approvalReviewDate) newProvisional.approvalReviewDate = null;
    if (newProvisional.approvalComment) newProvisional.approvalComment = null;
    if (newProvisional.contributorComment) newProvisional.contributorComment = null;
    newProvisional.sopVersion = '';
    newProvisional.publishClassification = false;
    if (newProvisional.publishSubmitter) newProvisional.publishSubmitter = null;
    if (newProvisional.publishAffiliation) newProvisional.publishAffiliation = null;
    if (newProvisional.publishDate) newProvisional.publishDate = null;
    if (newProvisional.publishComment) newProvisional.publishComment = null;
    newProvisional.evidenceSummary = this.state.evidenceSummary || null;
    // Total points and points counted for all evidence
    let classificationPoints = {}, scoreTableValues = this.state.scoreTableValues;
    // Autosomal Dominant OR X-linked Disorder case-level evidence
    classificationPoints['autosomalDominantOrXlinkedDisorder'] = {};
    // Set points for two variant types
    // Proband with 'predicted or proven null variant' variant type
    classificationPoints['autosomalDominantOrXlinkedDisorder']['probandWithPredictedOrProvenNull'] = {};
    classificationPoints['autosomalDominantOrXlinkedDisorder']['probandWithPredictedOrProvenNull']['evidenceCount'] = Number(scoreTableValues.probandPredictedOrProvenNullCount);
    classificationPoints['autosomalDominantOrXlinkedDisorder']['probandWithPredictedOrProvenNull']['probandCount'] = Number(scoreTableValues.probandPredictedOrProvenNullProbandCount);
    classificationPoints['autosomalDominantOrXlinkedDisorder']['probandWithPredictedOrProvenNull']['totalPointsGiven'] = Number(scoreTableValues.probandPredictedOrProvenNullPoints);
    classificationPoints['autosomalDominantOrXlinkedDisorder']['probandWithPredictedOrProvenNull']['pointsCounted'] = Number(scoreTableValues.probandPredictedOrProvenNullPointsCounted);
    // Proband with 'other variant type' variant type
    classificationPoints['autosomalDominantOrXlinkedDisorder']['probandWithOtherVariantType'] = {};
    classificationPoints['autosomalDominantOrXlinkedDisorder']['probandWithOtherVariantType']['evidenceCount'] = Number(scoreTableValues.probandOtherVariantTypeCount);
    classificationPoints['autosomalDominantOrXlinkedDisorder']['probandWithOtherVariantType']['probandCount'] = Number(scoreTableValues.probandOtherVariantTypeProbandCount);
    classificationPoints['autosomalDominantOrXlinkedDisorder']['probandWithOtherVariantType']['totalPointsGiven'] = Number(scoreTableValues.probandOtherVariantTypePoints);
    classificationPoints['autosomalDominantOrXlinkedDisorder']['probandWithOtherVariantType']['pointsCounted'] = Number(scoreTableValues.probandOtherVariantTypePointsCounted);
    // Points counted for Autosomal Dominant OR X-linked Disorder case-level evidence
    classificationPoints['autosomalDominantOrXlinkedDisorder']['pointsCounted'] = Number(scoreTableValues.probandPointsCounted);

    // Autosomal Recessive Disorder case-level evidence
    classificationPoints['autosomalRecessiveDisorder'] = {};
    // Proband with 'predicted or proven null variant' variant type
    classificationPoints['autosomalRecessiveDisorder']['probandWithPredictedOrProvenNull'] = {};
    classificationPoints['autosomalRecessiveDisorder']['probandWithPredictedOrProvenNull']['evidenceCount'] = Number(scoreTableValues.autoRec_probandPredictedOrProvenNullCount);
    classificationPoints['autosomalRecessiveDisorder']['probandWithPredictedOrProvenNull']['totalPointsGiven'] = Number(scoreTableValues.autoRec_probandPredictedOrProvenNullPoints);
    // Proband with 'other variant type' variant type
    classificationPoints['autosomalRecessiveDisorder']['probandWithOtherVariantType'] = {};
    classificationPoints['autosomalRecessiveDisorder']['probandWithOtherVariantType']['evidenceCount'] = Number(scoreTableValues.autoRec_probandOtherVariantTypeCount);
    classificationPoints['autosomalRecessiveDisorder']['probandWithOtherVariantType']['totalPointsGiven'] = Number(scoreTableValues.autoRec_probandOtherVariantTypePoints);
    // Proband count for Autosomal Recessive Disorder case-level evidence
    classificationPoints['autosomalRecessiveDisorder']['probandCount'] = Number(scoreTableValues.autosomalRecessiveProbandCount);
    // Points given for Autosomal Recessive Disorder case-level evidence
    classificationPoints['autosomalRecessiveDisorder']['pointsGiven'] = Number(scoreTableValues.autoRec_probandPredictedOrProvenNullPoints) + Number(scoreTableValues.autoRec_probandOtherVariantTypePoints);
    // Points counted for Autosomal Recessive Disorder case-level evidence
    classificationPoints['autosomalRecessiveDisorder']['pointsCounted'] = Number(scoreTableValues.autosomalRecessivePointsCounted);
    // Segregation case-level evidence
    classificationPoints['segregation'] = {};
    classificationPoints['segregation']['evidenceCountCandidate'] = Number(scoreTableValues.segregationCountCandidate);
    classificationPoints['segregation']['evidenceCountExome'] = Number(scoreTableValues.segregationCountExome);
    classificationPoints['segregation']['evidenceCountTotal'] = Number(scoreTableValues.segregationCountTotal);
    classificationPoints['segregation']['evidencePointsCandidate'] = this.classificationMathRound(Number(scoreTableValues.segregationPointsCandidate), 2);
    classificationPoints['segregation']['evidencePointsExome'] = this.classificationMathRound(Number(scoreTableValues.segregationPointsExome), 2);
    classificationPoints['segregation']['totalPointsGiven'] = this.classificationMathRound(Number(scoreTableValues.segregationTotalPoints), 2);
    classificationPoints['segregation']['pointsCounted'] = Number(scoreTableValues.segregationPointsCounted);
    // Case-Control genetic evidence
    classificationPoints['caseControl'] = {};
    classificationPoints['caseControl']['evidenceCount'] = Number(scoreTableValues.caseControlCount);
    classificationPoints['caseControl']['totalPointsGiven'] = Number(scoreTableValues.caseControlPoints);
    classificationPoints['caseControl']['pointsCounted'] = Number(scoreTableValues.caseControlPointsCounted);
    // Total points counted for all genetic evidence
    classificationPoints['geneticEvidenceTotal'] = Number(scoreTableValues.geneticEvidenceTotalPoints);
    // Function experimental evidence
    classificationPoints['function'] = {};
    classificationPoints['function']['biochemicalFunctions'] = {};
    classificationPoints['function']['biochemicalFunctions']['evidenceCount'] = Number(scoreTableValues.biochemicalFunctionCount);
    classificationPoints['function']['biochemicalFunctions']['totalPointsGiven'] = Number(scoreTableValues.biochemicalFunctionPoints);
    classificationPoints['function']['proteinInteractions'] = {};
    classificationPoints['function']['proteinInteractions']['evidenceCount'] = Number(scoreTableValues.proteinInteractionsCount);
    classificationPoints['function']['proteinInteractions']['totalPointsGiven'] = Number(scoreTableValues.proteinInteractionsPoints);
    classificationPoints['function']['expression'] = {};
    classificationPoints['function']['expression']['evidenceCount'] = Number(scoreTableValues.expressionCount);
    classificationPoints['function']['expression']['totalPointsGiven'] = Number(scoreTableValues.expressionPoints);
    classificationPoints['function']['totalPointsGiven'] = Number(scoreTableValues.biochemicalFunctionPoints) + Number(scoreTableValues.proteinInteractionsPoints) + Number(scoreTableValues.expressionPoints);
    classificationPoints['function']['pointsCounted'] = Number(scoreTableValues.functionalPointsCounted);
    // Functional Alteration experimental evidence
    classificationPoints['functionalAlteration'] = {};
    classificationPoints['functionalAlteration']['patientCells'] = {};
    classificationPoints['functionalAlteration']['patientCells']['evidenceCount'] = Number(scoreTableValues.patientCellsCount);
    classificationPoints['functionalAlteration']['patientCells']['totalPointsGiven'] = Number(scoreTableValues.patientCellsPoints);
    classificationPoints['functionalAlteration']['nonPatientCells'] = {};
    classificationPoints['functionalAlteration']['nonPatientCells']['evidenceCount'] = Number(scoreTableValues.nonPatientCellsCount);
    classificationPoints['functionalAlteration']['nonPatientCells']['totalPointsGiven'] = Number(scoreTableValues.nonPatientCellsPoints);
    classificationPoints['functionalAlteration']['totalPointsGiven'] = Number(scoreTableValues.patientCellsPoints) + Number(scoreTableValues.nonPatientCellsPoints);
    classificationPoints['functionalAlteration']['pointsCounted'] = Number(scoreTableValues.functionalAlterationPointsCounted);
    // Model Systems and Rescue experimental evidence
    classificationPoints['modelsRescue'] = {};
    classificationPoints['modelsRescue']['modelsNonHuman'] = {};
    classificationPoints['modelsRescue']['modelsNonHuman']['evidenceCount'] = Number(scoreTableValues.nonHumanModelCount);
    classificationPoints['modelsRescue']['modelsNonHuman']['totalPointsGiven'] = Number(scoreTableValues.nonHumanModelPoints);
    classificationPoints['modelsRescue']['modelsCellCulture'] = {};
    classificationPoints['modelsRescue']['modelsCellCulture']['evidenceCount'] = Number(scoreTableValues.cellCultureCount);
    classificationPoints['modelsRescue']['modelsCellCulture']['totalPointsGiven'] = Number(scoreTableValues.cellCulturePoints);
    classificationPoints['modelsRescue']['rescueHuman'] = {};
    classificationPoints['modelsRescue']['rescueHuman']['evidenceCount'] = Number(scoreTableValues.rescueHumanModelCount);
    classificationPoints['modelsRescue']['rescueHuman']['totalPointsGiven'] = Number(scoreTableValues.rescueHumanModelPoints);
    classificationPoints['modelsRescue']['rescueNonHuman'] = {};
    classificationPoints['modelsRescue']['rescueNonHuman']['evidenceCount'] = Number(scoreTableValues.rescueNonHumanModelCount);
    classificationPoints['modelsRescue']['rescueNonHuman']['totalPointsGiven'] = Number(scoreTableValues.rescueNonHumanModelPoints);
    classificationPoints['modelsRescue']['rescueCellCulture'] = {};
    classificationPoints['modelsRescue']['rescueCellCulture']['evidenceCount'] = Number(scoreTableValues.rescueCellCultureCount);
    classificationPoints['modelsRescue']['rescueCellCulture']['totalPointsGiven'] = Number(scoreTableValues.rescueCellCulturePoints);
    classificationPoints['modelsRescue']['rescuePatientCells'] = {};
    classificationPoints['modelsRescue']['rescuePatientCells']['evidenceCount'] = Number(scoreTableValues.rescuePatientCellsCount);
    classificationPoints['modelsRescue']['rescuePatientCells']['totalPointsGiven'] = Number(scoreTableValues.rescuePatientCellsPoints);
    classificationPoints['modelsRescue']['totalPointsGiven'] = Number(scoreTableValues.nonHumanModelPoints) + Number(scoreTableValues.cellCulturePoints) + Number(scoreTableValues.rescueHumanModelPoints)
      + Number(scoreTableValues.rescueNonHumanModelPoints) + Number(scoreTableValues.rescueCellCulturePoints) + Number(scoreTableValues.rescuePatientCellsPoints);
    classificationPoints['modelsRescue']['pointsCounted'] = Number(scoreTableValues.modelsRescuePointsCounted);
    // Total points counted for all experimental evidence
    classificationPoints['experimentalEvidenceTotal'] = Number(scoreTableValues.experimentalEvidenceTotalPoints);
    // TOTAL POINTS COUNTED FOR ALL EVIDENCE
    classificationPoints['evidencePointsTotal'] = Number(this.state.totalScore);
    // Assign 'classificationPoints' object to 'newProvisional'
    newProvisional.classificationPoints = Object.assign({}, classificationPoints);

    // Get earliestPubliations data
    newProvisional.earliestArticles = this.state.earliestPubList && this.state.earliestPubList.length ? this.state.earliestPubList : null;

    // check required item (reasons)
    let formErr = false;
    // Check text is not only whitespaces
    if (!newProvisional.evidenceSummary || !newProvisional.evidenceSummary.trim()) {
      formErr = true;
      this.setFormErrors('classification-evidence-summary', 'Required');
    }
    // Check text is not only whitespaces
    if ((!newProvisional.reasons || !newProvisional.reasons.trim()) && newProvisional.alteredClassification !== 'No Modification') {
      formErr = true;
      this.setFormErrors('reasons', 'Required when changing classification.');
    }
    if (newProvisional.autoClassification === newProvisional.alteredClassification) {
      formErr = true;
      this.setFormErrors('alteredClassification', 'Modified classification should be different from calculated classification');
    }
    if (!formErr) {
      this.setState({ isSubmitting: true });
      this.addProvisional(newProvisional);
    }
  }

  renderProvisionalInfo(provisional) {
    return (
      <div>
        {Object.keys(provisional).length ?
          <p className="alert alert-info">
            <i className="icon icon-info-circle"></i> Click Save to save the Calculated Classification (highlighted in blue) without modification, or modify
              the Classification value in the pull-down and hit Save. Once it is saved, you will have the opportunity to edit the saved Classification, view the
              Evidence Summary for the saved Classification, and save it as Provisional.
          </p>
          :
          <p className="alert alert-info">
            <i className="icon icon-info-circle"></i> The Classification Matrix at the top of the page was calculated based on the current evidence and accompanying
              scores saved in the database when you clicked the "View Classification Matrix" button to navigate to this page. To save a new Classification, optionally
              modifying the Classification and/or adding an Evidence Summary, please fill in any desired fields above and click "Save". Otherwise, click "Cancel".<br /><br />
              After saving, you will be able to view the Evidence Summary for the saved Classification, and be presented with the option to save it as
              a <strong>Provisional</strong> Classification (and then <strong>Approved</strong>).
          </p>
        }
      </div>
    );
  }

  render() {
    // this.queryValues.gdmUuid = queryKeyValue('gdm', this.props.href);
    // let calculate = queryKeyValue('calculate', this.props.href);
    // let edit = queryKeyValue('edit', this.props.href);
    // let session = (this.props.session && Object.keys(this.props.session).length) ? this.props.session : null;
    // const context = this.props.context;
    // const currOmimId = this.state.currOmimId;
    let gdm = this.state.gdm ? this.state.gdm : null;
    let autoClassification = this.state.autoClassification;
    let scoreTableValues = this.state.scoreTableValues;

    // let show_clsfctn = queryKeyValue('classification', this.props.href);
    // let summaryMatrix = queryKeyValue('summarymatrix', this.props.href);
    // let expMatrix = queryKeyValue('expmatrix', this.props.href);

    // set the 'Current Classification' appropriately only if previous provisional exists
    let provisional = this.state.provisional;
    let currentClassification = 'None';
    let showAnimalOnlyTag = true;
    if (provisional.last_modified) {
      if (provisional.alteredClassification && provisional.alteredClassification !== 'No Modification') {
        currentClassification = provisional.alteredClassification;
        showAnimalOnlyTag = false;
      } else {
        currentClassification = provisional.autoClassification ? provisional.autoClassification : this.state.autoClassification;
      }
    }
    let sortedSnapshotList = this.state.classificationSnapshots.length ? sortListByDate(this.state.classificationSnapshots, 'date_created') : [];
    const lastSavedDate = currentClassification !== 'None' ? getClassificationSavedDate(provisional) : null;
    const affiliation = this.props.auth ? this.props.auth.currentAffiliation : null;
    const classificationStatus = this.state.classificationStatus;
    const allowPublishButton = gdm && gdm.disease && this.state.allowEdit ? allowPublishGlobal(affiliation, 'classification', gdm.modeInheritance, gdm.disease.PK) : false;
    // Only support to save and provisionally approve the latest SOP format
    const currentSOP = provisional ? isScoringForCurrentSOP(provisional.classificationPoints) : false;
    const demoVersion = this.props.demoVersion;
    const mdEvidenceSummaryError = this.state.formErrors['classification-evidence-summary'];
    const mdEvidenceSummary = {
      name:"classification-evidence-summary",
      placeholder:"Note: This text will appear on ClinGen's website if you publish this Classification.",
      style:mdEvidenceSummaryError ? { border: 'solid 1px red' } : {}
    };

    return (
      <div>
        <GdmHeader isSummary={true} />
        <Container fluid>
          <GdmClassificationRecords className="mx-2" />
        </Container>
        <div className="container summary-provisional-classification-wrapper">
          {this.state.allowEdit ?
          <>
          <form onSubmit={this.submitForm} className="form-horizontal mt-5">
            <CardPanel className="classification-matrix-panel" title="Calculated Classification Matrix" open>
              <div className="form-group">
                <div className="summary-matrix-wrapper">
                  <table className="summary-matrix">
                    <tbody>
                      <tr className="header large bg-gray separator-below">
                        <td colSpan="6">Evidence Type</td>
                        <td>Variant Count</td>
                        <td>Proband Count</td>
                        <td>Total Points</td>
                        <td>Points Counted</td>
                      </tr>
                      <tr>
                        <td rowSpan="10" className="header"><div className="rotate-text"><div>Genetic Evidence</div></div></td>
                        <td rowSpan="8" className="header"><div className="rotate-text"><div>Case-Level</div></div></td>
                        <td rowSpan="4" className="header"><div className="rotate-text"><div>Variant</div></div></td>
                        <td rowSpan="2" className="header">Autosomal Dominant OR X-linked Disorder</td>
                        <td colSpan="2">Predicted or proven null variant</td>
                        <td>{scoreTableValues['probandPredictedOrProvenNullCount']}</td>
                        <td>{scoreTableValues['probandPredictedOrProvenNullProbandCount']}</td>
                        <td>{scoreTableValues['probandPredictedOrProvenNullPoints']}</td>
                        <td rowSpan="2">{scoreTableValues['probandPointsCounted']}</td>
                      </tr>
                      <tr>
                        <td colSpan="2">Other variant type</td>
                        <td>{scoreTableValues['probandOtherVariantTypeCount']}</td>
                        <td>{scoreTableValues['probandOtherVariantTypeProbandCount']}</td>
                        <td>{scoreTableValues['probandOtherVariantTypePoints']}</td>
                      </tr>
                      <tr>
                        <td rowSpan="2" className="header">Autosomal Recessive Disorder</td>
                        <td colSpan="2">Predicted or proven null variant</td>
                        <td>{scoreTableValues['autoRec_probandPredictedOrProvenNullCount']}</td>
                        <td rowSpan="2">{scoreTableValues['autosomalRecessiveProbandCount']}</td>
                        <td rowSpan="2">{scoreTableValues['autosomalRecessivePoints']}</td>
                        <td rowSpan="2">{scoreTableValues['autosomalRecessivePointsCounted']}</td>
                      </tr>
                      <tr>
                        <td colSpan="2">Other variant type</td>
                        <td>{scoreTableValues['autoRec_probandOtherVariantTypeCount']}</td>
                      </tr>
                      <tr>
                        <td colSpan="2" rowSpan="4" className="header">Segregation</td>
                        <td className="bg-gray"><span></span></td>
                        <td className="header">Summed LOD</td>
                        <td colSpan="2" className="header">Family Count</td>
                        <td rowSpan="4">{scoreTableValues['segregationPointsCounted']}</td>
                        <td rowSpan="4">{scoreTableValues['segregationPointsCounted']}</td>
                      </tr>
                      <tr>
                        <td>Candidate gene sequencing</td>
                        <td><span>{this.classificationMathRound(scoreTableValues['segregationPointsCandidate'], 2)}</span></td>
                        <td colSpan="2">{scoreTableValues['segregationCountCandidate']}</td>
                      </tr>
                      <tr>
                        <td>Exome/genome or all genes sequenced in linkage region</td>
                        <td><span>{this.classificationMathRound(scoreTableValues['segregationPointsExome'], 2)}</span></td>
                        <td colSpan="2">{scoreTableValues['segregationCountExome']}</td>
                      </tr>
                      <tr>
                        <td className="header">Total Summed LOD Score</td>
                        <td className="header">{this.classificationMathRound(scoreTableValues['segregationTotalPoints'], 2)}</td>
                        <td colSpan="2" className="bg-gray"><span></span></td>
                      </tr>
                      <tr>
                        <td colSpan="5" className="header">Case-Control</td>
                        <td colSpan="2">{scoreTableValues['caseControlCount']}</td>
                        <td>{scoreTableValues['caseControlPoints']}</td>
                        <td>{scoreTableValues['caseControlPointsCounted']}</td>
                      </tr>
                      <tr className="header separator-below">
                        <td colSpan="8">Genetic Evidence Total</td>
                        <td>{scoreTableValues['geneticEvidenceTotalPoints']}</td>
                      </tr>
                      <tr>
                        <td rowSpan="12" className="header"><div className="rotate-text"><div>Experimental Evidence</div></div></td>
                        <td colSpan="3" rowSpan="3" className="header">Functional</td>
                        <td colSpan="3">Biochemical Functions</td>
                        <td>{scoreTableValues['biochemicalFunctionCount']}</td>
                        <td>{scoreTableValues['biochemicalFunctionPoints']}</td>
                        <td rowSpan="3">{scoreTableValues['functionalPointsCounted']}</td>
                      </tr>
                      <tr>
                        <td colSpan="3">Protein Interactions</td>
                        <td>{scoreTableValues['proteinInteractionsCount']}</td>
                        <td>{scoreTableValues['proteinInteractionsPoints']}</td>
                      </tr>
                      <tr>
                        <td colSpan="3">Expression</td>
                        <td>{scoreTableValues['expressionCount']}</td>
                        <td>{scoreTableValues['expressionPoints']}</td>
                      </tr>
                      <tr>
                        <td colSpan="3" rowSpan="2" className="header">Functional Alteration</td>
                        <td colSpan="3">Patient cells</td>
                        <td>{scoreTableValues['patientCellsCount']}</td>
                        <td>{scoreTableValues['patientCellsPoints']}</td>
                        <td rowSpan="2">{scoreTableValues['functionalAlterationPointsCounted']}</td>
                      </tr>
                      <tr>
                        <td colSpan="3">Non-patient cells</td>
                        <td>{scoreTableValues['nonPatientCellsCount']}</td>
                        <td>{scoreTableValues['nonPatientCellsPoints']}</td>
                      </tr>
                      <tr>
                        <td colSpan="3" rowSpan="2" className="header">Models</td>
                        <td colSpan="3">Non-human model organism</td>
                        <td>{scoreTableValues['nonHumanModelCount']}</td>
                        <td>{scoreTableValues['nonHumanModelPoints']}</td>
                        <td rowSpan="6">{scoreTableValues['modelsRescuePointsCounted']}</td>
                      </tr>
                      <tr>
                        <td colSpan="3">Cell culture model</td>
                        <td>{scoreTableValues['cellCultureCount']}</td>
                        <td>{scoreTableValues['cellCulturePoints']}</td>
                      </tr>
                      <tr>
                        <td colSpan="3" rowSpan="4" className="header">Rescue</td>
                        <td colSpan="3">Rescue in human</td>
                        <td>{scoreTableValues['rescueHumanModelCount']}</td>
                        <td>{scoreTableValues['rescueHumanModelPoints']}</td>
                      </tr>
                      <tr>
                        <td colSpan="3">Rescue in non-human model organism</td>
                        <td>{scoreTableValues['rescueNonHumanModelCount']}</td>
                        <td>{scoreTableValues['rescueNonHumanModelPoints']}</td>
                      </tr>
                      <tr>
                        <td colSpan="3">Rescue in cell culture model</td>
                        <td>{scoreTableValues['rescueCellCultureCount']}</td>
                        <td>{scoreTableValues['rescueCellCulturePoints']}</td>
                      </tr>
                      <tr>
                        <td colSpan="3">Rescue in patient cells</td>
                        <td>{scoreTableValues['rescuePatientCellsCount']}</td>
                        <td>{scoreTableValues['rescuePatientCellsPoints']}</td>
                      </tr>
                      <tr className="header separator-below">
                        <td colSpan="8">Experimental Evidence Total</td>
                        <td>{scoreTableValues['experimentalEvidenceTotalPoints']}</td>
                      </tr>
                      <tr className="total-row header">
                        <td colSpan="9">Total Points</td>
                        <td>{this.state.totalScore}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="summary-provisional-classification-description">
                  <p className="alert alert-warning">
                    <i className="icon icon-exclamation-circle"></i> The <strong>Total Points</strong> shown above are based on the set of saved evidence and accompanying scores existing
                      when the "View Classification Matrix" button was clicked. To save a Classification for this Gene Disease Record based on this evidence, please see the section below.
                  </p>
                </div>
                <div className="provisional-classification-wrapper">
                  <table className="summary-matrix">
                    <tbody>
                      <tr className="header large bg-gray">
                        <td colSpan="5">Gene/Disease Pair</td>
                      </tr>
                      <tr>
                        <td>Assertion Criteria</td>
                        <td>Genetic Evidence (0-12 points)</td>
                        <td>Experimental Evidence (0-6 points)</td>
                        <td>Total Points (0-18 points)</td>
                        <td>Replication Over Time (Yes/No) <ContextualHelp content="> 2 pubs w/ convincing evidence over time (>3 yrs)" /></td>
                      </tr>
                      <tr className="header large bg-gray separator-below">
                        <td>Assigned Points</td>
                        <td>{scoreTableValues['geneticEvidenceTotalPoints']}</td>
                        <td>{scoreTableValues['experimentalEvidenceTotalPoints']}</td>
                        <td>{this.state.totalScore}</td>
                        <td>
                          <input type="checkbox" className="checkbox" onChange={this.handleReplicatedOverTime} checked={this.state.replicatedOverTime} value={this.state.replicatedOverTime} />
                          {renderEarliestPublications(this.state.earliestPubList)}
                        </td>
                      </tr>
                      <tr className="header large">
                        <td colSpan="2" rowSpan="5">Calculated Classification</td>
                        <td className={autoClassification === 'No Known Disease Relationship' ? ' bg-emphasis' : null}>No Known Disease Relationship</td>
                        <td colSpan="2" className={autoClassification === 'No Known Disease Relationship' ? ' bg-emphasis' : null}>No Scored Genetic Evidence & No Contradictory Evidence</td>
                      </tr>
                      <tr className={"header large" + (autoClassification === 'Limited' ? ' bg-emphasis' : null)}>
                        <td>LIMITED</td>
                        <td colSpan="2">0.1-6</td>
                      </tr>
                      <tr className={"header large" + (autoClassification === 'Moderate' ? ' bg-emphasis' : null)}>
                        <td>MODERATE</td>
                        <td colSpan="2">7-11</td>
                      </tr>
                      <tr className={"header large" + (autoClassification === 'Strong' ? ' bg-emphasis' : null)}>
                        <td>STRONG</td>
                        <td colSpan="2">12-18</td>
                      </tr>
                      <tr className={"header large" + (autoClassification === 'Definitive' ? ' bg-emphasis' : null)}>
                        <td>DEFINITIVE</td>
                        <td colSpan="2">12-18 & Replicated Over Time</td>
                      </tr>
                      <tr>
                        <td colSpan="2" className="header large">Contradictory Evidence?</td>
                        <td colSpan="3">
                          Proband: <strong>{this.state.contradictingEvidence.proband ? <span className='emphasis'>Yes</span> : 'No'}</strong>&nbsp;&nbsp;&nbsp;
                            {/*Case-control: <strong>{this.state.contradictingEvidence.caseControl ? <span className='emphasis'>Yes</span> : 'No'}</strong>&nbsp;&nbsp;&nbsp;*/}
                            Experimental: <strong>{this.state.contradictingEvidence.experimental ? <span className='emphasis'>Yes</span> : 'No'}</strong>&nbsp;&nbsp;&nbsp;
                        </td>
                      </tr>
                      <tr>
                        <td colSpan="5">
                          <a name="classification-view" id="classification-view"></a>
                          <div className="classification-form-content-wrapper">
                            <div className="col-md-11 col-xs-11 col-sm-11">
                              <div className="altered-classification">
                                <Input type="select" name="alteredClassification"
                                  label={<span>Modify Calculated <a href="/provisional-curation/?classification=display" target="_block">Clinical Validity Classification</a>:</span>}
                                  error={this.state.formErrors['alteredClassification']}
                                  labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="row mb-3"
                                  value={this.state.alteredClassification} onChange={this.handleChange}>
                                  <option value="No Modification">No Modification</option>
                                  {autoClassification === 'Definitive' ? null : <option value="Definitive">Definitive</option>}
                                  {autoClassification === 'Strong' ? null : <option value="Strong">Strong</option>}
                                  {autoClassification === 'Moderate' ? null : <option value="Moderate">Moderate</option>}
                                  {autoClassification === 'Limited' ? null : <option value="Limited">Limited</option>}
                                  <option value="Disputed">Disputed</option>
                                  <option value="Refuted">Refuted</option>
                                  <option value="No Known Disease Relationship">No Known Disease Relationship (calculated score is based on Experimental evidence only)</option>
                                </Input>
                              </div>
                              <div className="altered-classification-reasons">
                                <Input type="textarea" name="reasons" rows="5" label="Explain Reason(s) for Change:" labelClassName="col-sm-5 control-label"
                                  wrapperClassName="col-sm-7" groupClassName="row mb-3" error={this.state.formErrors['reasons']} value={this.state.reasons}
                                  onChange={this.handleChange}
                                  required={this.state.alteredClassification !== 'No Modification' ? true : false}
                                  placeholder="Note: This text will appear on ClinGen's website if you publish this Classification."
                                />
                                {this.state.resetAlteredClassification ?
                                  <div className="altered-classification-reset-warning">
                                    <div className="alert alert-danger">
                                      <i className="icon icon-exclamation-triangle"></i> This value has been reset to "No Modification" as the Calculated Classification based on the new
                                        Total Points is now equivalent to your last saved Classification value. Click "Save" to save the Calculated Classification value, or modify to a new
                                        value and click "Save."
                                    </div>
                                  </div>
                                  : null}
                              </div>
                              <div className="classification-evidence-summary">
                                <div className="row mb-1">
                                  <div className="col-md-12 col-sx-12 col-sm-12">
                                    <label className="control-label">
                                      <span className="label-main">Evidence Summary (required):
                                        <span className="label-note"> Rationale for the clinical validity classification </span>
                                        <span className="label-note"><a href="https://clinicalgenome.org/docs/standardized-evidence-summary-text/" target="_block">View Example Evidence Summary Text</a></span>
                                      </span>
                                    </label>
                                  </div>
                                </div>
                                <div className="row mb-1">
                                  <div className="col-md-6 col-sx-6 col-sm-6">Evidence Summary text edit tool</div>
                                  <div className="col-md-6 col-sx-6 col-sm-6">Evidence Summary text display</div>
                                </div>
                                <div className="row md-editor">
                                  <div className="col-md-11 col-xs-11 col-sm-11 offset-md-1 offset-xs-1 offset-sm-1">
                                    <MDEditor
                                      value={this.state.evidenceSummary}
                                      onChange={this.handleSummaryChange}
                                      textareaProps={mdEvidenceSummary}
                                    />
                                    { mdEvidenceSummaryError && <span style={{ color: 'red', fontSize: 12 }}>{ mdEvidenceSummaryError }</span> }
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr className="total-row header">
                        <td colSpan="2">Last Saved Summary Classification</td>
                        <td colSpan="3">
                          {currentClassification === 'None' ?
                            <span>{currentClassification}</span>
                            :
                            <div>
                              {currentClassification}
                              {showAnimalOnlyTag &&
                                <span>&nbsp;{renderAnimalOnlyTag(provisional)}</span>
                              }
                              <br />
                              <span className="large">({moment(lastSavedDate).format("YYYY MMM DD, h:mm a")})</span>
                            </div>
                          }
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {this.renderProvisionalInfo(provisional)}
              </div>
            </CardPanel>
            <div className="modal-footer">
              <Button variant="secondary" className="float-right align-self-end mb-2 ml-2" onClick={this.handleCancel}>Cancel</Button>
              <LoadingButton
                type="submit"
                className="align-self-end mb-2 ml-2 float-right "
                variant="primary"
                text="Save"
                textWhenLoading="Submitting"
                isLoading={this.state.isSubmitting}
              />
            </div>
          </form>
          {sortedSnapshotList.length && (!allowPublishButton || !currentSOP) ?
            <div>
              <p className="alert alert-info">
                <i className="icon icon-info-circle"></i> The option to publish an approved classification is unavailable when any of the following
                  apply: 1) your affiliation does not have permission to publish in the GCI, 2) the mode of inheritance is not supported by the Clinical Validity
                  Classification framework, 3) the associated disease does not have a MONDO ID, 4) it is based on a previous version of the SOP.
              </p>
            </div>
            : null}
          </>
          : null}
          {sortedSnapshotList.length ?
            <div className="snapshot-list">
              <CardPanel title="Saved Provisional and Approved Classification(s)" panelClassName="panel-data" open>
                <Snapshots
                  snapshots={sortedSnapshotList}
                  gdm={gdm}
                  classificationStatus={classificationStatus}
                  allowEdit={this.state.allowEdit}
                  allowPublishButton={allowPublishButton}
                  demoVersion={demoVersion}
                  fromProvisionalCuration={true}
                />
              </CardPanel>
            </div>
            : null}
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => ({
  auth: state.auth,
  gdm: state.gdm.entity,
  annotations: state.annotations
});

const mapDispatchToProps = dispatch => ({
  setGdmAction: gdm => dispatch(setGdmAction(gdm)),
})

export default connect(mapStateToProps, mapDispatchToProps)(ProvisionalCuration);
