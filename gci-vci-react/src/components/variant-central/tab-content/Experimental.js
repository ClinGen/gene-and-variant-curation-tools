import React, { Component } from 'react';

import { connect } from 'react-redux';
import { RestAPI as API } from '@aws-amplify/api-rest';
import { API_NAME } from '../../../utils';
import isEmpty from 'lodash/isEmpty';
import property from 'lodash/property';
import cloneDeep from 'lodash/cloneDeep';

import FunctionalDataTable from './FunctionalDataTable';
import EvaluationForm from '../../EvaluationForm';
import { evaluationsByGroup, filterCodeStripObjects, compareFormGroupValues } from '../helpers/helpers';
import { AddArticleEvidenceTableView } from './ArticleEvidenceTableView';
import { CompleteSection } from "./CompleteSection";
import CardPanel from '../../common/CardPanel';
import { AmplifyAPIRequestRecycler } from "../../../utilities/fetchUtilities";

// Experimental Tab Content
// State mostly handled in Parent (InterpretationView)
class Experimental extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedTab: 0,
      functionalData: {},
      loadingLdhFuncData: false,
      funcDataDiffFlag: false,
      errorLdhFuncData: null,
      saveAlert: null,
    };
    this.requestRecycler = new AmplifyAPIRequestRecycler();
  }

  componentDidMount() {
    this.getExternalFunctionalData();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.evaluations && this.props.evaluations !== prevProps.evaluations
    && this.props.evaluations.BS3.functional !== prevProps.evaluations.BS3.functional
    || this.state.functionalData !== prevState.functionalData) {
      this.getEvaluationFunctionalData();
    }
  }

  componentWillUnmount() {
    this.requestRecycler.cancelAll();
  }

  getExternalFunctionalData = async () => {
    this.setState({ loadingLdhFuncData: true });
    let stateObj = { loadingLdhFuncData: false };
    try {
      const { variant } = this.props;
      if (variant) {
        const { carId, clinvarVariantId } = variant;
        const variantId = carId ? carId : clinvarVariantId;
        if (variantId) {
          const url = `/functional/?variantId=${variantId}`;
          const response = await this.requestRecycler.capture(API.get(API_NAME, url));
          if (!isEmpty(response)) {
            stateObj.functionalData = response;
          }
        }
      }
    } catch (error) {
      if (API.isCancel(error)) {
        return;
      }
      stateObj.errorLdhFuncData = error;
      console.log(JSON.parse(JSON.stringify(error)));
    }
    this.setState(stateObj);
  }

  getEvaluationFunctionalData = async () => {
    try {
      const { evaluations } = this.props;
      const functionalPK = evaluations
        ? evaluations.BS3 && evaluations.BS3.functional
          ? evaluations.BS3.functional
          : evaluations.PS3 && evaluations.PS3.functional
            ? evaluations.PS3.functional
            : ''
        : '';
      if (!this.state.loadingLdhFuncData && !isEmpty(this.state.functionalData) && functionalPK) {
        const evalFuncResponse = await this.requestRecycler.capture(API.get(API_NAME, `/functional/${functionalPK}`));
        const studiesEvals = cloneDeep(evaluationsByGroup([["BS3"], ["PS3"]], this.props.evaluations));
        if (!isEmpty(evalFuncResponse)) {
          studiesEvals.BS3.functional = evalFuncResponse;
          studiesEvals.PS3.functional = evalFuncResponse;
          const funcDataDiffFlag = this.compareFunctionalData(this.state.functionalData, studiesEvals);
          this.setState({ funcDataDiffFlag });
        }
      }
    } catch (error) {
      if (API.isCancel(error)) {
        return;
      }
      console.log(JSON.parse(JSON.stringify(error)));
    }
  }
    
  compareFunctionalData = (newFuncData, savedEvals) => {
    // Returns true if @newAfis is different from @oldAfis based on the unique @rev, otherwise returns false
    const isDiffAfisVersion = (newAfis, oldAfis) => {
      if (isEmpty(oldAfis) || isEmpty(newAfis)) {
        return true;
      }
      const afisKeys = newAfis && Object.keys(newAfis);
      return afisKeys.some(key => {
        const oldStatements = oldAfis[key] && oldAfis[key].statements;
        const newStatements = newAfis[key] && newAfis[key].statements;
        if (!oldStatements || !newStatements || oldStatements.length !== newStatements.length) {
          return true;
        }
        return newStatements.some((statement, index) => {
          if (oldStatements[index] && oldStatements[index].rev !== statement.rev) {
            return true;
          }
          return false;
        });
      });
    };
    
    const evalKeys = Object.keys(savedEvals);
    return evalKeys.some(key => {
      const evaluation = savedEvals[key];
      if (['BS3', 'PS3'].indexOf(evaluation.code) > -1) {
        return isDiffAfisVersion(newFuncData, evaluation.functional && evaluation.functional.functionalData);
      }
      return false;
    });
  }
    
  // Match the material in the ldSet to determine if material is patient sourced
  isPatientSourced = (materialId, ldSet = []) => {
    return ldSet.some(set => {
      const ldSetMaterialId = property(['entContent', 'entities', 'Material', 0, 'ldhId'])(set);
      if (ldSetMaterialId === materialId) {
        const isPatientSourced = property(['entContent', 'relation', 'value'])(set);
        return isPatientSourced === 'Yes';
      }
      return false;
    });
  }
    
  // Match the material ID and the genotype ID to determine the genotype label
  getGenotypeLabel = (materialId, ldSet = [], genotypes = []) => {
    let genotypeLabel = 'none';
    ldSet.some(set => {
      const ldSetMaterialId = property(['entContent', 'entities', 'Material', 0, 'ldhId'])(set);
      if (ldSetMaterialId === materialId) {
        const ldSetGenotypeId = property(['entContent', 'entities', 'Genotype', 0, 'ldhId'])(set);
        return genotypes.some(genotype => {
          if (genotype.ldhId === ldSetGenotypeId) {
            genotypeLabel = genotype.entId;
            return true;
          }
          return false;
        });
      }
      return false;
    });
    return genotypeLabel;
  }
    
  // Create the link to OLS based on the code and iri
  getOntologiesUrl = (code = '', iri = '') => {
    // The ontology iri's for effects in the LDH contain a colon instead of an underscore.
    // An underscore is needed to create the link to OLS
    // This is a temporary workaround until the LDH is updated
    const iriWithColon = iri.split(':');
    let newIri = iri;
    if (iriWithColon[2]) {
      newIri = `${iriWithColon[0]}:${iriWithColon[1]}_${iriWithColon[2]}`;
    }
    let ontologyId = code.split(':')[0];
    if (ontologyId.includes('EFO> ')) {
      ontologyId = ontologyId.substring(5);
    }
    return `https://www.ebi.ac.uk/ols/ontologies/${ontologyId}/terms?iri=${encodeURIComponent(newIri)}`;
  }
    
    handleTabSelect = (selectedTab) => {
      this.setState({ selectedTab });
    }

  handleSaveFunctionalData = async (event, values, groups) => {
    const { functionalData, funcDataDiffFlag } = this.state;
    const { variant, onSubmitEval } = this.props;
    if (compareFormGroupValues(values, groups)) {
      return;
    }
    const params = {
      body: {
        functional: {
          functionalData,
          variant: variant.PK
        }
      }
    };
    try {
      // check if previous functional data exists to decide to put or post
      if (this.props.evaluations && this.props.evaluations.BS3.functional) {
        // only put if there is a difference in the functional data
        if (funcDataDiffFlag) {
          const putUrl = `/functional/${this.props.evaluations.BS3.functional}`;
          const response = await this.requestRecycler.capture(API.put(API_NAME, putUrl, params));
          if (response) {
            const additionalData = {
              functional: response.PK
            }
            onSubmitEval(event, values, groups, additionalData);
          }
        } else {
          onSubmitEval(event, values, groups);
        }
      } else {
        // even if there is no functional data, post anyways to track the fact that there was
        // no functional data at the time of saving
        const postUrl = '/functional';
        const response = await this.requestRecycler.capture(API.post(API_NAME, postUrl, params));
        if (response) {
          const additionalData = {
            functional: response.PK
          }
          onSubmitEval(event, values, groups, additionalData);
        }
      }
    } catch(error) {
      if (API.isCancel(error)) {
        return;
      }
      console.log('Saving functional data error', error);
      const flatGroups = Array.isArray(groups) && groups.flat();
      const alertId = flatGroups[0];
      const saveAlert = {
        id: alertId,
        type: 'danger',
        message: 'Save failed! Please try again later.'
      };
      this.setState({ saveAlert });
    }
  };

  render() {
    const {
      evaluations,
      view,
      selectChange,
      textChange,
      alert,
      loading,
      onSubmitEval,
    } = this.props;

    const {
      saveAlert,
      selectedTab,
      functionalData,
      loadingLdhFuncData,
      errorLdhFuncData,
      funcDataDiffFlag,
    } = this.state;

    // Props to pass to Evaluation Form
    const formProps = {
      textChange: textChange,
      selectChange: selectChange,
    };

    const hotspotGroups = [["PM1"]];
    const studiesGroups = [["BS3"], ["PS3"]];

    return (
      <>
        <h2>Hotspot or functional domain</h2>
        {view === "Interpretation" && (
          <EvaluationForm
            {...formProps} 
            evaluations={evaluationsByGroup(hotspotGroups, evaluations)}
            criteria={filterCodeStripObjects(["PM1"])}
            criteriaGroups={hotspotGroups}
            onSubmitEval={onSubmitEval}
            loading={loading['PM1']}
            alert={!isEmpty(alert) && alert.id === 'PM1' ? alert : {}}
          />
        )}
        <CardPanel title="Curated Literature Evidence (Hotspot or functional domain)">
          <AddArticleEvidenceTableView
            category="experimental" 
            subcategory="hotspot-functiona-domain"
            criteriaList={['PM1']} 
          />
        </CardPanel>

        <h2>Experimental Studies</h2>
        {view === "Interpretation" && (
          <EvaluationForm
            {...formProps} 
            evaluations={evaluationsByGroup(studiesGroups, evaluations)}
            criteria={filterCodeStripObjects(["BS3", "PS3"])}
            criteriaGroups={studiesGroups}
            criteriaCrossCheck={[["BS3", "PS3"]]}
            onSubmitEval={this.handleSaveFunctionalData}
            loading={loading['BS3']}
            alert={isEmpty(alert)
              ? saveAlert && saveAlert.id === 'BS3' ? saveAlert : {}
              : alert.id === 'BS3' ? alert : {}
            }
          />
        )}
        {!loadingLdhFuncData && funcDataDiffFlag
          && (
            <p className="alert alert-warning">
              <b>Notice:</b> Some of the data retrieved below has changed since the last time you evaluated these criteria. Please update your evaluation as needed.
            </p>
          )
        }
        <FunctionalDataTable
          selectedTab={selectedTab}
          functionalData={functionalData}
          loadingLdhFuncData={loadingLdhFuncData}
          errorLdhFuncData={errorLdhFuncData}
          handleTabSelect={this.handleTabSelect}
          isPatientSourced={this.isPatientSourced}
          getGenotypeLabel={this.getGenotypeLabel}
          getOntologiesUrl={this.getOntologiesUrl}
        />

        <CardPanel title="Curated Literature Evidence (Experimental Studies)">
          <AddArticleEvidenceTableView 
            category="experimental" 
            subcategory="experimental-studies"
            criteriaList={['BS3', 'PS3']} 
          />
        </CardPanel>

        {view === "Interpretation" && (
          <CompleteSection tabName="experimental" updateTab={this.props.updateTab} />
        )}
      </>
    );
  }
}

const mapStateToProps = state => ({
  variant: state.variant
});

export default connect(mapStateToProps)(Experimental);
