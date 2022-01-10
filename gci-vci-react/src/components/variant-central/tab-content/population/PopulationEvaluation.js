import React, { useState, useEffect, useCallback } from 'react';
import isEqual from 'lodash/isEqual';

import EvaluationForm from '../../../EvaluationForm';
import { evaluationsByGroup, filterCodeStripObjects } from '../../helpers/helpers';
// import { findDiffKeyValues } from '../../helpers/find_diff';
import { API } from 'aws-amplify';
import { API_NAME } from '../../../../utils';

// Population Form Content	
// Local State is handled in Parent (InterpretationView)	
function PopulationEvaluation(props) {

  const { selectChange, cspecCriteria, textChange, alert, loading } = props;

  // "or" Evaluation Groupings	
  const criteriaGroups = [["BA1"], ["BS1"], ["PM2"]];

  // Keep track of evaluations and view state managed in parent	
  const [activeView, setActiveView] = useState(props.view);
  const [evaluations, setEvaluations] = useState(props.evaluations);
  const [populationObjDiffFlag, popDataIsDifferent] = useState(false);
  const [saveAlert, setAlert] = useState(null);

  useEffect(() => {
    setActiveView(props.view);
    setEvaluations(props.evaluations);
  }, [props.view, props.evaluations]);

  const populationEvaluations = {};
  criteriaGroups.forEach(group => {
    if (evaluations[group]) {
      populationEvaluations[group] = evaluations[group];
    }
  });

  const compareExternalData = useCallback(async () => {
    if (populationEvaluations.BA1 && populationEvaluations.BA1.population) {
      const getUrl = `/populations/${populationEvaluations.BA1.population}`;
      const response = await API.get(API_NAME, getUrl);
      if (response) {
        let tempCompare = !isEqual(props.populationData, response.populationData);
        popDataIsDifferent(tempCompare);
      }
    }
  // eslint-disable-next-line
  }, [])
  useEffect(() => { 
    compareExternalData();
  }, [compareExternalData]);
  
  const handleSavePopulationData = async (event, values, groups) => {
    const { populationData, variant, onSubmitEval } = props;
    const population = {
      populationData: {populationData},
      variant: variant.PK,
      item_type: 'population'
    }
    const params = {body: population};
    try {
      if (populationEvaluations.BA1 && populationEvaluations.BA1.population) {
        const putUrl = `/populations/${populationEvaluations.BA1.population}`;
        const response = await API.put(API_NAME, putUrl, params);
        if (response) {
          const additionalData = {
            population: response.PK
          }
          onSubmitEval(event, values, groups, additionalData);
        }
      } else {
        const postUrl = '/populations';
        const response = await API.post(API_NAME, postUrl, params);
        if (response) {
          const additionalData = {
            population: response.PK
          }
          onSubmitEval(event, values, groups, additionalData);
        }
      }
    } catch(error) {
      console.log('Saving population data error', error);
      setAlert({
        type: 'danger',
        message: 'Save failed! Please try again later.'
      });
    }
  }

  // Props to pass to Evaluation Form	
  const formProps = {
    title: 'Population Criteria Evaluation',
    criteria: filterCodeStripObjects(["BA1", "BS1", "PM2"]),
    criteriaGroups: criteriaGroups,
    criteriaCrossCheck: [["BA1", "BS1", "PM2"]],
    cspecCriteria: cspecCriteria,
    evaluations: evaluationsByGroup(criteriaGroups, props.evaluations),
    textChange: textChange,
    selectChange: selectChange,
    onSubmitEval: handleSavePopulationData,
    alert: saveAlert ? saveAlert : alert,
    loading: loading['BA1'],
  };

  return (
    <>
      {activeView === "Interpretation" && (
        <EvaluationForm {...formProps} />
      )}
      {populationObjDiffFlag
        && (
          <p className="alert alert-warning">
            <b>Notice:</b> Some of the data retrieved below has changed since the last time you evaluated these criteria. Please update your evaluation as needed.
          </p>
        )
      }
    </>
  )
}
export default PopulationEvaluation;