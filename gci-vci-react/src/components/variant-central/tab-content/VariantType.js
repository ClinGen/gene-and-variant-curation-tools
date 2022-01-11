import React, { Component } from 'react';
import { RestAPI as API } from '@aws-amplify/api-rest';
import { API_NAME } from '../../../utils';
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import { default as lodashGet } from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';

import CardPanel from "../../common/CardPanel";
import { ExternalLink } from '../../common/ExternalLink';
import { renderDataCredit } from '../helpers/credit';
import EvaluationForm from '../../EvaluationForm';
import { CompleteSection } from "./CompleteSection";
import {
  compareFormGroupValues,
  filterCodeStripObjects,
  evaluationsByGroup,
  parseKeyValue,
  setContextLinks,
  getGenomicLinkouts,
} from '../helpers/helpers';
import { computationalStatic, initialComputationalData } from '../helpers/computational';
import ClinGenPredictorsTable from './variantTypeTables/ClinGenPredictorsTable';
import OtherPredictorsTable from './variantTypeTables/OtherPredictorsTable';
import ConservationTable from './variantTypeTables/ConservationTable';
import ClinVarVariantsTable from './variantTypeTables/ClinVarVariantsTable';
import ExternalResourcesPanel from '../../common/ExternalResourcesPanel';
import { AddArticleEvidenceTableView } from './ArticleEvidenceTableView';
import { AmplifyAPIRequestRecycler } from '../../../utilities/fetchUtilities';

// Variant Type Tab
// Most State handled in parent InterpretationView
class VariantType extends Component {
  constructor(props) {
    super(props);
    this.state = {
      tabIndex: props.tabIndex, // Tab index received from CodeStrip click
      computationalObj: initialComputationalData,
      esearchData: {},
      isLoadingEsearch: false,
      compDataDiffFlag: false,
      hasOtherPredData: false,
      hasConservationData: false,
    }
    this.requestRecycler = new AmplifyAPIRequestRecycler()
  }

  componentDidMount() {
    this.handleCodonEsearch();
  }
  
  componentDidUpdate(prevProps) {
    if (this.props.myVariantInfoData !== prevProps.myVariantInfoData) {
      const { myVariantInfoData } = this.props;
      if (myVariantInfoData) {
        const computationalObj = this.buildComputationalObj(myVariantInfoData);
        this.setState({ computationalObj });
      }
    }
    if (this.props.evaluations && this.props.evaluations !== prevProps.evaluations && this.props.evaluations.BP1.computational !== prevProps.evaluations.BP1.computational) {
      this.compareComputationalData(this.state.computationalObj, this.props.evaluations).catch(AmplifyAPIRequestRecycler.defaultCatch);
    }
    if (this.props.tabIndex !== prevProps.tabIndex){
      this.setState({ tabIndex: this.props.tabIndex })
    }
  }

  componentWillUnmount() {
    this.requestRecycler.cancelAll();
  }

  setTabHandler = (index) => {
    this.props.subTabHandler(index);
  }

  setTabIndex = (tabIndex) => {
    this.setState({ tabIndex });
  }

  // Retrieve codon data from ClinVar Esearch given Eutils/ClinVar response
  handleCodonEsearch = async () => {
    const { variant } = this.props;
    if (!variant || !variant.clinvarVariantId) {
      return;
    }
    this.setState({ isLoadingEsearch: true });
    try {
      const url = `/computational/?clinvarVariantId=${variant.clinvarVariantId}`
      const response = await this.requestRecycler.capture(API.get(API_NAME, url));
      if (response) {
        this.setState({ esearchData: response, isLoadingEsearch: false});
      }
    } catch(error) {
      if (API.isCancel(error)) {
        return;
      }
      this.setState({ isLoadingEsearch: false });
      console.log('ClinVarEsearch Fetch Error=: %o', error);
    }
  }

  compareComputationalData = async (newCompData, savedEvals) => {
    const missenseFunctionalGroups = [["BP1"], ["PP2", "PP3"], ["BP4"]];
    const missenseFuncEvals = cloneDeep(evaluationsByGroup(missenseFunctionalGroups, savedEvals));
    const computationalPK = missenseFuncEvals.BP1 && missenseFuncEvals.BP1.computational ? missenseFuncEvals.BP1.computational : '';
    if (computationalPK) {
      const evalFuncResponse = await this.requestRecycler.capture(API.get(API_NAME, `/computational/${computationalPK}`));
      missenseFuncEvals.BP1.computational = evalFuncResponse;
      missenseFuncEvals.PP2.computational = evalFuncResponse;
      missenseFuncEvals.PP3.computational = evalFuncResponse;
      missenseFuncEvals.BP4.computational = evalFuncResponse;
      const evalKeys = Object.keys(missenseFuncEvals);
      return evalKeys.some(key => {
        const evaluation = missenseFuncEvals[key];
        if (['BP1', 'PP2', 'PP3', 'BP4'].indexOf(evaluation.code) > -1) {
          const isEqualData = isEqual(newCompData, evaluation.computational && evaluation.computational.computationalData);
          if (!isEqualData) {
            this.setState({ compDataDiffFlag: true });
            return true;
          }
        }
        return false;
      });
    }
  }

  buildComputationalObj = (myVariantInfoData) => {
    const objWithOtherPred = this.parseOtherPredData(myVariantInfoData);
    const objWithConservation = this.parseConservationData(myVariantInfoData, objWithOtherPred);
    const completeComputationalObj = this.parseClingenPredData(myVariantInfoData, objWithConservation);
    return completeComputationalObj;
  }

  parseOtherPredData = (myVariantInfoData) => {
    const computationalObj = cloneDeep(this.state.computationalObj);
    // Not all variants return the dbnsfp{...} object from myvariant.info
    if (myVariantInfoData.dbnsfp) {
      const { dbnsfp } = myVariantInfoData;
      // get scores from dbnsfp
      computationalObj.other_predictors.sift.score = (dbnsfp.sift && dbnsfp.sift.score)
        && this.convertScoreToArray(dbnsfp.sift.score);
      computationalObj.other_predictors.sift.prediction = (dbnsfp.sift && dbnsfp.sift.pred)
        && this.convertPredToString(dbnsfp.sift.pred);
      computationalObj.other_predictors.polyphen2_hdiv.score = (dbnsfp.polyphen2 && dbnsfp.polyphen2.hdiv.score)
        && this.convertScoreToArray(dbnsfp.polyphen2.hdiv.score);
      computationalObj.other_predictors.polyphen2_hdiv.prediction = (dbnsfp.polyphen2 && dbnsfp.polyphen2.hdiv.pred)
        && this.convertPredToString(dbnsfp.polyphen2.hdiv.pred);
      computationalObj.other_predictors.polyphen2_hvar.score = (dbnsfp.polyphen2 && dbnsfp.polyphen2.hvar.score)
        && this.convertScoreToArray(dbnsfp.polyphen2.hvar.score);
      computationalObj.other_predictors.polyphen2_hvar.prediction = (dbnsfp.polyphen2 && dbnsfp.polyphen2.hvar.pred)
        && this.convertPredToString(dbnsfp.polyphen2.hvar.pred);
      computationalObj.other_predictors.lrt.score = (dbnsfp.lrt && dbnsfp.lrt.score)
        && this.convertScoreToArray(dbnsfp.lrt.score);
      computationalObj.other_predictors.lrt.prediction = (dbnsfp.lrt && dbnsfp.lrt.pred)
        && this.convertPredToString(dbnsfp.lrt.pred);
      computationalObj.other_predictors.mutationtaster.score = (dbnsfp.mutationtaster && dbnsfp.mutationtaster.score)
        && this.convertScoreToArray(dbnsfp.mutationtaster.score);
      computationalObj.other_predictors.mutationtaster.prediction = (dbnsfp.mutationtaster && dbnsfp.mutationtaster.pred)
        && this.convertPredToString(dbnsfp.mutationtaster.pred);
      computationalObj.other_predictors.mutationassessor.score = (dbnsfp.mutationassessor && dbnsfp.mutationassessor.score)
        && this.convertScoreToArray(dbnsfp.mutationassessor.score);
      computationalObj.other_predictors.mutationassessor.prediction = (dbnsfp.mutationassessor && dbnsfp.mutationassessor.pred)
        && this.convertPredToString(dbnsfp.mutationassessor.pred);
      computationalObj.other_predictors.fathmm.score = (dbnsfp.fathmm && dbnsfp.fathmm.score)
        && this.convertScoreToArray(dbnsfp.fathmm.score);
      computationalObj.other_predictors.fathmm.prediction = (dbnsfp.fathmm && dbnsfp.fathmm.pred)
        && this.convertPredToString(dbnsfp.fathmm.pred);
      computationalObj.other_predictors.provean.score = (dbnsfp.provean && dbnsfp.provean.score)
        && this.convertScoreToArray(dbnsfp.provean.score);
      computationalObj.other_predictors.provean.prediction = (dbnsfp.provean && dbnsfp.provean.pred)
        && this.convertPredToString(dbnsfp.provean.pred);
      computationalObj.other_predictors.metasvm.score = (dbnsfp.metasvm && dbnsfp.metasvm.score)
        && this.convertScoreToArray(dbnsfp.metasvm.score);
      computationalObj.other_predictors.metasvm.prediction = (dbnsfp.metasvm && dbnsfp.metasvm.pred)
        && this.convertPredToString(dbnsfp.metasvm.pred);
      computationalObj.other_predictors.metalr.score = (dbnsfp.metalr && dbnsfp.metalr.score)
        && this.convertScoreToArray(dbnsfp.metalr.score);
      computationalObj.other_predictors.metalr.prediction = (dbnsfp.metalr && dbnsfp.metalr.pred)
        && this.convertPredToString(dbnsfp.metalr.pred);
      computationalObj.other_predictors.fathmm_mkl.score = (dbnsfp['fathmm-mkl'] && dbnsfp['fathmm-mkl'].coding_score)
        && this.convertScoreToArray(dbnsfp['fathmm-mkl'].coding_score);
      computationalObj.other_predictors.fathmm_mkl.prediction = (dbnsfp['fathmm-mkl'] && dbnsfp['fathmm-mkl'].coding_pred)
        && this.convertPredToString(dbnsfp['fathmm-mkl'].coding_pred);
      computationalObj.other_predictors.fitcons.score = (dbnsfp.integrated && dbnsfp.integrated.fitcons_score)
        && this.convertScoreToArray(dbnsfp.integrated.fitcons_score);
      // update computationalObj, and set flag indicating that we have other predictors data
      // this.setState({ hasOtherPredData: true, computationalObj: computationalObj });
    }
    if (myVariantInfoData.cadd) {
      const { cadd } = myVariantInfoData;
      computationalObj.other_predictors.cadd.score = this.numToString(cadd.rawscore);
      // update computationalObj, and set flag indicating that we have other predictors data
    }
    return computationalObj;
  }

  // Method to assign conservation scores data to global computation object
  parseConservationData = (myVariantInfoData, compObj) => {
    // Not all variants return the dbnsfp{...} object from myvariant.info
    if (myVariantInfoData.dbnsfp) {
      const computationalObj = cloneDeep(compObj);
      const { dbnsfp } = myVariantInfoData;
      // get scores from dbnsfp
      computationalObj.conservation.phylop7way = (lodashGet(dbnsfp, 'phylo.p7way', null))
        ? this.numToString(dbnsfp.phylo.p7way.vertebrate)
        : lodashGet(dbnsfp, 'phylo.p100way.vertebrate', null)
          ? this.numToString(dbnsfp.phylo.p100way.vertebrate)
          : null;
      computationalObj.conservation.phylop20way = (lodashGet(dbnsfp, 'phylo.p20way', null))
        ? this.numToString(dbnsfp.phylo.p20way.mammalian)
        : lodashGet(dbnsfp, 'phylo.p30way.mammalian', null)
          ? this.numToString(dbnsfp.phylo.p30way.mammalian)
          : null;
      computationalObj.conservation.phastconsp7way = (lodashGet(dbnsfp, "phastcons['7way']", null))
        ? this.numToString(dbnsfp.phastcons['7way'].vertebrate)
        : lodashGet(dbnsfp, "phastcons['100way']", null)
          ? this.numToString(dbnsfp.phastcons['100way'].vertebrate)
          : null;
      computationalObj.conservation.phastconsp20way = (lodashGet(dbnsfp, "phastcons['20way']", null))
        ? this.numToString(dbnsfp.phastcons['20way'].mammalian)
        : lodashGet(dbnsfp, "phastcons['30way']", null)
          ? this.numToString(dbnsfp.phastcons['30way'].mammalian)
          : null;
      computationalObj.conservation.gerp = dbnsfp['gerp++'] ? this.numToString(dbnsfp['gerp++'].rs) : null;
      computationalObj.conservation.siphy = dbnsfp.siphy_29way ? this.numToString(dbnsfp.siphy_29way.logodds) : null;
      return computationalObj;
    }
    return compObj;
  }

  /**
     * Method to assign clingen predictors data to global computation object
     * REVEL data is now parsed from myvariant.info response
     * It can be accessed via response['dbnsfp']['revel'] or using
     * the 'parseKeyValue()' helper function which traverse the tree down to 2nd level
     * 
     * TBD on where the CFTR data is queried from after Bustamante lab is no longer the source
     * And thus the CFTR data parsing in this method needs to be altered in the future
     * 
     * @param {object} myVariantInfoData - The response object returned by myvariant.info
     */
  parseClingenPredData = (myVariantInfoData, compObj) => {
    const computationalObj = cloneDeep(compObj);
    const revel = parseKeyValue(myVariantInfoData, 'revel'),
      cftr = parseKeyValue(myVariantInfoData, 'cftr');
    if (revel) {
      computationalObj.clingen.revel.score = (revel.score) && this.numToString(revel.score);
    }
    if (cftr) {
      computationalObj.clingen.cftr.score = (cftr.score) && this.numToString(cftr.score);
      computationalObj.clingen.cftr.visible = (cftr.score) ? true : false;
    }
    // update computationalObj, and set flag indicating that we have clingen predictors data
    return computationalObj;
  }

  // Method to convert score value to array of numbers
  convertScoreToArray = (obj) => {
    const newArr = [];
    if (Array.isArray(obj)) {
      obj.forEach((value) => {
        if (!isNaN(value) && value !== null) {
          newArr.push(Number(value));
        }
      });
    } else {
      if (!isNaN(obj) && obj !== null) {
        return [Number(obj)];
      }
    }
    return newArr;
  }

  // Method to convert prediction array to string
  convertPredToString = (obj) => {
    const newArr = [];
    let newStr = '';
    if (Array.isArray(obj)) {
      obj.forEach((value) => {
        const letterPattern = /^[a-z]+$/i;
        if (value.match(letterPattern)) {
          newArr.push(value);
        }
      });
      newStr = newArr.join(', ');
    } else {
      newStr = obj;
    }
    return newStr;
  }

  // Method to handle conservation scores
  numToString = (num) => {
    if (num !== '' && num !== null) {
      const score = parseFloat(num);
      return (!isNaN(score)) ? score.toString() : null;
    }
    return null;
  }

  checkVariantType = () => {
    const { variant } = this.props;
    let seqChangeTypes = ['del', 'dup', 'ins', 'indels', 'inv', 'con'];
    let genomicHGVS, ncGenomic;

    if (variant && variant.hgvsNames && variant.hgvsNames.GRCh37) {
      genomicHGVS = variant.hgvsNames.GRCh37;
    } else if (variant && variant.hgvsNames && variant.hgvsNames.GRCh38) {
      genomicHGVS = variant.hgvsNames.GRCh38;
    }
    if (variant && variant.variationType && variant.variationType !== 'single nucleotide variant') {
      return false;
    } else if (genomicHGVS) {
      ncGenomic = genomicHGVS.substring(genomicHGVS.indexOf(':'));
      seqChangeTypes.forEach(type => {
        if (ncGenomic.indexOf(type) > 0) {
          return false;
        }
      });
    }
    return true;
  }

  handleSaveComputationalData = async (event, values, groups) => {
    const { variant, onSubmitEval, evaluations } = this.props;
    if (isEqual(groups, [['BP1', 'PP2'], ['PP3', 'BP4']])) {
      const { computationalObj } = this.state;
      if (compareFormGroupValues(values, groups)) {
        return;
      }
      const params = {
        body: {
          computational: {
            computationalData: computationalObj,
            variant: variant.PK
          }
        }
      };
      try {
        const missenseFunctionalGroups = [["BP1"], ["PP2", "PP3"], ["BP4"]];
        const missenseFuncEvals = evaluationsByGroup(missenseFunctionalGroups, evaluations);
        if (missenseFuncEvals && missenseFuncEvals.BP1.computational) {
          const putUrl = `/computational/${missenseFuncEvals.BP1.computational}`;
          const response = await this.requestRecycler.capture(API.put(API_NAME, putUrl, params));
          if (response) {
            const additionalData = {
              computational: response.PK
            }
            onSubmitEval(event, values, groups, additionalData);
          }
        } else {
          const postUrl = '/computational';
          const response = await this.requestRecycler.capture(API.post(API_NAME, postUrl, params));
          if (response) {
            const additionalData = {
              computational: response.PK
            }
            onSubmitEval(event, values, groups, additionalData);
          }
        }
      } catch(error) {
        if (API.isCancel(error)) {
          return;
        }
        console.log('Saving computational data error', error);
        const flatGroups = Array.isArray(groups) && groups.flat();
        const alertId = flatGroups[0];
        const saveAlert = {
          id: alertId,
          type: 'danger',
          message: 'Save failed! Please try again later.'
        };
        this.setState({ saveAlert });
      }
    } else {
      onSubmitEval(event, values, groups);
    }
  }

  renderSpliceSitePredictors = () => (
    <CardPanel title="Splice Site Predictors">
      <ExternalLink
        href="http://hollywood.mit.edu/burgelab/maxent/Xmaxentscan_scoreseq.html"
        className="mr-3"
      >
        Analyze using MaxEntScan
      </ExternalLink>
      <ExternalLink
        href="http://www.fruitfly.org/seq_tools/splice.html"
        className="mr-3"
      >
        Analyze using NNSPLICE
      </ExternalLink>
      <ExternalLink
        href="https://spliceailookup.broadinstitute.org/"
        className="mr-3"
      >
        Analyze using SpliceAI
      </ExternalLink>
      <ExternalLink
        href="https://varseak.bio/"
        className="mr-1"
      >
        Analyze using varSEAK
      </ExternalLink>
      <ExternalLink
        title="See more info on varSEAK"
        className="no-external-link"
        href="https://varseak.bio/pdf/SSP-Documentation.pdf"
      >
        <FontAwesomeIcon icon={faInfoCircle} className="text-info" />
      </ExternalLink>
    </CardPanel>
  );

  render() {
    const {
      computationalObj,
      esearchData,
      isLoadingEsearch,
      compDataDiffFlag,
      saveAlert,
    } = this.state;
    const {
      selectChange,
      textChange,
      alert,
      loading,
      view,
      activeCode,
      variant,
      evaluations,
      cspecCriteria,
      isLoadingMyVariantInfo,
      onSubmitEval
    } = this.props;

    // Define "or" evaluation groups
    const missenseFunctionalGroups = [["BP1"], ["PP2", "PP3"], ["BP4"]];
    const missenseOtherGroups = [["PM5", "PS1"]];
    const lossFunctionGroups = [["PVS1"]];
    const silentGroups = [["BP7"]];
    const inFrameGroups = [["BP3"], ["PM4"]];

    // Missense/Functional, Conservation, and Splicing Predictors Props/state
    const formProps = {
      textChange: textChange,
      selectChange: selectChange,
      onSubmitEval: onSubmitEval,
      activeCode: activeCode
    };

    const conservation = computationalObj && computationalObj.conservation;
    const conservationStatic = computationalStatic.conservation;

    const otherPred = computationalObj && computationalObj.other_predictors;
    const otherPredStatic = computationalStatic.other_predictors;

    const clinGenPred = computationalObj && computationalObj.clingen;
    const clinGenPredStatic = computationalStatic.clingen;

    const { gRCh38, gRCh37 } = getGenomicLinkouts(variant);
    const gRCh38Links = gRCh38 && setContextLinks(gRCh38, 'GRCh38');
    const gRCh37Links = gRCh37 && setContextLinks(gRCh37, 'GRCh37');

    const isSingleNucleotide = this.checkVariantType();

    const codonCount = esearchData && esearchData.esearchresult && parseInt(esearchData.esearchresult.count);
    const codonTerm = esearchData && esearchData.vci_term;
    const codonSymbol = esearchData && esearchData.vci_symbol;

    return (
      <section>

        <Tabs
          className="mt-3"
          selectedIndex={this.state.tabIndex}
          forceRenderTabPanel
          onSelect={(tabIndex) => this.setTabIndex(tabIndex)}
        >

          <TabList className="nav nav-pills nav-fill">
            <Tab className="nav-item nav-link" onClick={() => this.setTabHandler(0)}>Missense</Tab>
            <Tab className="nav-item nav-link" onClick={() => this.setTabHandler(1)}>Loss of Function</Tab>
            <Tab className="nav-item nav-link" onClick={() => this.setTabHandler(2)}>Silent &amp; Intron</Tab>
            <Tab className="nav-item nav-link" onClick={() => this.setTabHandler(3)}>In-frame Indel</Tab>
          </TabList>

          {/* Missense sub-tab content */}

          <TabPanel className="tab-panel">

            <h2>Functional, Conservation, and Splicing Predictors</h2>
            {view === "Interpretation" && (
              <EvaluationForm
                {...formProps}
                onSubmitEval={this.handleSaveComputationalData}
                evaluations={evaluationsByGroup(missenseFunctionalGroups, evaluations)}
                criteria={filterCodeStripObjects(["BP1", "PP2", "PP3", "BP4"])}
                criteriaGroups={missenseFunctionalGroups}
                criteriaCrossCheck={[['BP1', 'PP2'], ['PP3', 'BP4']]}
                cspecCriteria={cspecCriteria}
                loading={loading['BP1']}
                alert={isEmpty(alert)
                  ? saveAlert && saveAlert.id === 'BP1' ? saveAlert : {}
                  : alert.id === 'BP1' ? alert : {}
                }
              />
            )}

            {!isLoadingMyVariantInfo && compDataDiffFlag
              && (
                <p className="alert alert-warning">
                  <b>Notice:</b> Some of the data retrieved below has changed since the last time you evaluated these criteria. Please update your evaluation as needed.
                </p>
              )
            }

            <ClinGenPredictorsTable
              clinGenPred={clinGenPred}
              clinGenPredStatic={clinGenPredStatic}
              isSingleNucleotide={isSingleNucleotide}
              isLoadingMyVariantInfo={isLoadingMyVariantInfo}
            />

            <OtherPredictorsTable
              otherPred={otherPred}
              otherPredStatic={otherPredStatic}
              isSingleNucleotide={isSingleNucleotide}
              isLoadingMyVariantInfo={isLoadingMyVariantInfo}
            />

            <ConservationTable
              gRCh37Links={gRCh37Links}
              conservation={conservation}
              conservationStatic={conservationStatic}
              isSingleNucleotide={isSingleNucleotide}
              isLoadingMyVariantInfo={isLoadingMyVariantInfo}
            />

            {this.renderSpliceSitePredictors()}

            <CardPanel title="Curated Literature Evidence (Functional, Conservation, and Splicing Predictors)">
              <AddArticleEvidenceTableView 
                category="variant-type" 
                subcategory="functional-conservation-splicing-predictors"
                criteriaList={['BP1', 'PP2', 'PP3', 'BP4']}
              />
            </CardPanel>

            <h2>Other Variants in Same Codon</h2>
            {view === "Interpretation" && (
              <EvaluationForm
                {...formProps}
                evaluations={evaluationsByGroup(missenseOtherGroups, evaluations)}
                criteria={filterCodeStripObjects(["PM5", "PS1"])}
                criteriaGroups={missenseOtherGroups}
                criteriaCrossCheck={[['PM5'], ['PS1']]}
                cspecCriteria={cspecCriteria}
                loading={loading['PM5']}
                alert={!isEmpty(alert) && alert.id === 'PM5' ? alert : {}}
              />
            )}

            <ClinVarVariantsTable
              codonCount={codonCount}
              codonTerm={codonTerm}
              codonSymbol={codonSymbol}
              isLoadingEsearch={isLoadingEsearch}
            />

            <CardPanel title="Curated Literature Evidence (Other Variants in Same Codon)">
              <AddArticleEvidenceTableView 
                category="variant-type" 
                subcategory="other-variants-in-codon"
                criteriaList={['PM5', 'PS1']} 
              />
            </CardPanel>

          </TabPanel>

          {/* Loss of Function sub-tab content */}

          <TabPanel className="tab-panel">

            <h2>Null variant analysis</h2>
            {view === "Interpretation" && (
              <EvaluationForm
                {...formProps}
                evaluations={evaluationsByGroup(lossFunctionGroups, evaluations)}
                criteria={filterCodeStripObjects(["PVS1"])}
                criteriaGroups={lossFunctionGroups}
                cspecCriteria={cspecCriteria}
                loading={loading['PVS1']}
                alert={!isEmpty(alert) && alert.id === 'PVS1' ? alert : {}}
              />
            )}
            <p>
              <a href="https://www.clinicalgenome.org/working-groups/sequence-variant-interpretation/" target="_blank" rel="noopener noreferrer">
                Sequence Variant Interpretation (SVI) Working Group guidance
              </a>
            </p>
            <p className="alert alert-primary">
              Does variant result in LOF?
            </p>
            <p className="alert alert-primary">
              Is LOF known mechanism for disease of interest?
            </p>

            <CardPanel title="Curated Literature Evidence (Null variant analysis)">
              <AddArticleEvidenceTableView 
                category="variant-type"
                subcategory="null-variant-analysis"
                criteriaList={['PVS1']} 
              />
            </CardPanel>
  
          </TabPanel>

          {/* Silent & Intron sub-tab content */}

          <TabPanel className="tab-panel">

            <h2>Molecular Consequence: Silent &amp; Intron</h2>
            {view === "Interpretation" && (
              <EvaluationForm
                {...formProps}
                evaluations={evaluationsByGroup(silentGroups, evaluations)}
                criteria={filterCodeStripObjects(["BP7"])}
                criteriaGroups={silentGroups}
                cspecCriteria={cspecCriteria}
                loading={loading['BP7']}
                alert={!isEmpty(alert) && alert.id === 'BP7' ? alert : {}}
              />
            )}
  
            {this.renderSpliceSitePredictors()}

            <CardPanel title="Curated Literature Evidence (Molecular Consequence: Silent & Intron)">
              <AddArticleEvidenceTableView
                category="variant-type"
                subcategory="molecular-consequence-silent-intron"
                criteriaList={['BP7']}
              />
            </CardPanel>

          </TabPanel>

          {/* In-frame Indel sub-tab content */}

          <TabPanel className="tab-panel">

            <h2>Molecular Consequence: Inframe indel</h2>
            {view === "Interpretation" && (
              <EvaluationForm
                {...formProps}
                evaluations={evaluationsByGroup(inFrameGroups, evaluations)}
                criteria={filterCodeStripObjects(["BP3", "PM4"])}
                criteriaGroups={inFrameGroups}
                criteriaCrossCheck={[['BP3', 'PM4']]}
                cspecCriteria={cspecCriteria}
                loading={loading['BP3']}
                alert={!isEmpty(alert) && alert.id === 'BP3' ? alert : {}}
              />
            )}

            <ExternalResourcesPanel
              view="panel"
              gRCh38={gRCh38}
              gRCh37={gRCh37}
              gRCh38Links={gRCh38Links}
              gRCh37Links={gRCh37Links}
            />

            <CardPanel title="Curated Literature Evidence (Molecular Consequence: Inframe indel)">
              <AddArticleEvidenceTableView
                category="variant-type"
                subcategory="molecular-consequence-inframe-indel"
                criteriaList={['BP3', 'PM4']}
              />
            </CardPanel>

          </TabPanel>
        </Tabs>
        {view === "Interpretation" && (
          <CompleteSection tabName="variant-type" updateTab={this.props.updateTab} />
        )}
        {renderDataCredit('myvariant', 'variant-type')}
      </section>
    );
  }
}

export default VariantType;
