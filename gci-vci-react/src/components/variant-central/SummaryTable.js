import React, { useState, useEffect } from 'react';
import CardPanel from '../common/CardPanel';
import { codeStripValues } from './mapping/CodeStripValues';

const SummaryTable = (props) => {

const {evaluations} = props;
const [sortedEvaluations, setSortedEvaluations] = useState(null);
useEffect(()=>{
    // Set Array of Evaluations, sorted by strength
    if (evaluations && Object.values(evaluations).length){
        setSortedEvaluations(sortByStrength(Object.values(evaluations)));
    }
},[evaluations])
    
return(
    <section>
        <CardPanel title="Criteria meeting an evaluation strength" className="mt-5 mb-3" >
            <table className="table summary-table">
                <thead>
                    {tableHeader()}
                </thead>
                {sortedEvaluations && sortedEvaluations.met ?
                    <tbody>
                        {sortedEvaluations.met.map(function(item, i) {
                            return (renderMetCriteriaRow(item, i));
                        })}
                    </tbody>
                    :
                    <tbody><tr>
                        <td colSpan="6">No criteria meeting an evaluation strength.</td>
                    </tr></tbody>
                }
            </table>
        </CardPanel>

        <CardPanel title="Criteria evaluated as 'Not met'" className="mb-3">
            {sortedEvaluations && sortedEvaluations.not_met ?
            <table className="table summary-table">
                <thead>
                    {tableHeader()}
                </thead>
                <tbody>
                    {sortedEvaluations.not_met.map(function(item, i) {
                        return (renderNotMetCriteriaRow(item, i));
                    })}
                </tbody>
            </table>
            : <div className="text-center pt-3 pb-3">No criteria evaluated as "Not Met"</div>
            }
        </CardPanel>

        <CardPanel title="Criteria 'Not yet evaluated'" >
            <table className="table summary-table">
                <thead>
                    {tableHeader()}
                </thead>
                {sortedEvaluations && sortedEvaluations.not_evaluated ?
                    <tbody>
                        {sortedEvaluations.not_evaluated.map(function(item, i) {
                            return (renderNotEvalCriteriaRow(item, i));
                        })}
                    </tbody>
                    :
                    <tbody><tr>
                        <td colSpan="6">No criteria yet to be evaluated.</td>
                    </tr></tbody>
                }
            </table>
        </CardPanel>
    </section>
    )

    // Method to render static table header
function tableHeader() {
    return (
        <tr>
            <th width="5%"><span className="label-benign">B</span>/<span className="label-pathogenic">P</span></th>
            <th width="10%">Criteria</th>
            <th width="40%">Criteria Descriptions</th>
            <th width="5%">Modified</th>
            <th width="15%">Status</th>
            <th width="25%">Explanation</th>
        </tr>
    );
    }
    
    // Method to render "met" criteria table rows
    function renderMetCriteriaRow(item, key) {
    return (
        <tr key={key} className="row-criteria-met" data-evaltype={getCriteriaType(item)}>
            <td width="5%" className="criteria-class ">
                <span className={getCriteriaType(item) === 'benign' ? 'benign' : 'pathogenic'}><i className="icon icon-check-circle"></i></span>
            </td>
            <td width="10%" className={'criteria-code ' + getCriteriaClass(item)}>{item.criteria}</td>
            <td width="40%" className="criteria-description ">{getCriteriaDescription(item)}</td>
            <td width="5%" className="criteria-modified " data-modlevel={getModifiedLevel(item)}>
                {item.criteriaModifier ? 'Yes' : 'No'}
            </td>
            <td width="15%" className="evaluation-status">
                {item.criteriaModifier ? item.criteria + '_' + item.criteriaModifier: item.criteriaStatus}
            </td>
            <td width="25%" className="evaluation-description text-pre-wrap">{item.explanation}</td>
        </tr>
    );
    }
    
    // Method to render "not-met" criteria table rows
    function renderNotMetCriteriaRow(item, key) {
    return (
        <tr key={key} className="row-criteria-not-met">
            <td width="5%" className="criteria-class">
                <span className={getCriteriaType(item) === 'benign' ? 'benign' : 'pathogenic'}><i className="icon icon-times-circle"></i></span>
            </td>
            <td width="10%" className={'criteria-code ' + getCriteriaClass(item)}>{item.criteria}</td>
            <td width="40%" className="criteria-description">{getCriteriaDescription(item)}</td>
            <td width="5%" className="criteria-modified">N/A</td>
            <td width="15%" className="evaluation-status">Not Met</td>
            <td width="25%" className="evaluation-description text-pre-wrap">{item.explanation}</td>
        </tr>
    );
    }
    
    // Method to render "not-evaluated" criteria table rows
    function renderNotEvalCriteriaRow(item, key) {
    return (
        <tr key={key} className="row-criteria-not-evaluated">
            <td width="5%" className="criteria-class">
                <span className={getCriteriaType(item) === 'benign' ? 'benign' : 'pathogenic'}><i className="icon icon-circle-o"></i></span>
            </td>
            <td width="10%" className={'criteria-code ' + getCriteriaClass(item)}>{item.criteria}</td>
            <td width="40%" className="criteria-description">{getCriteriaDescription(item)}</td>
            <td width="5%" className="criteria-modified">N/A</td>
            <td width="15%" className="evaluation-status">Not Evaluated</td>
            <td width="25%" className="evaluation-description text-pre-wrap">{item.explanation ? item.explanation : null}</td>
        </tr>
    );
    }
    
    // Method to get critetia type: benign or pathogenic
    function getCriteriaType(entry) {
    const values = Object.values(codeStripValues);
    let type;
    
    values.forEach(val => {
        if (val.code === entry.criteria) {
            switch (val.class) {
                case 'stand-alone':
                case 'benign-strong':
                case 'benign-supporting':
                    type = 'benign';
                    break;
                case 'pathogenic-supporting':
                case 'pathogenic-moderate':
                case 'pathogenic-strong' :
                case 'pathogenic-very-strong':
                    type = 'pathogenic';
                    break;
                default:
                    type = '';
            }
        }
    });
    return type;
    }
    
    // Method to get criteria class
    function getCriteriaClass(entry) {
    const values = Object.values(codeStripValues);
    let classification = '';
    
    values.forEach(val => {
        if (val.code === entry.criteria) {
            classification = val.class;
        }
    });
    return classification;
    }
    
    // Get short critetia description
    function getCriteriaDescription(entry) {
    let description = '';
    let values = Object.values(codeStripValues);
    
    values.forEach(val => {
        if (val.code === entry.criteria) {
            description = val.definition;
        }
    });
    return description;
    }
    
    // Method to get criteria strength
    function getCriteriaStrength(entry) {
    const values = Object.values(codeStripValues);
    let strength = '';
    
    values.forEach(val => {
        if (val === entry.criteria) {
            switch (val.class) {
                case 'stand-alone':
                    strength = 'stand-alone';
                    break;
                case 'pathogenic-very-strong':
                    strength = 'very-strong';
                    break;
                case 'benign-strong':
                case 'pathogenic-strong':
                    strength = 'strong';
                    break;
                case 'pathogenic-moderate':
                    strength = 'moderate';
                    break;
                case 'benign-supporting':
                case 'pathogenic-supporting':
                    strength = 'supporting';
                    break;
                default:
                    strength = '';
            }
        }
    });
    return strength;
    }
    
    // Method to determine the levels a criteria is modified
    function getModifiedLevel(entry) {
    let modifiedLevel;
    if (entry.criteriaModifier && getCriteriaStrength(entry) === 'very-strong') {
        switch (entry.criteriaModifier) {
            case 'strong':
                modifiedLevel = '1-down';
                break;
            case 'moderate':
                modifiedLevel = '2-down';
                break;
            case 'supporting':
                modifiedLevel = '3-down';
                break;
            default: return null;
        }
    }
    if (entry.criteriaModifier && getCriteriaStrength(entry) === 'stand-alone') {
        switch (entry.criteriaModifier) {
            case 'strong':
                modifiedLevel = '1-down';
                break;
            case 'supporting':
                modifiedLevel = '2-down';
                break;
            default: return null;
        }
    }
    if (entry.criteriaModifier && getCriteriaStrength(entry) === 'strong') {
        switch (entry.criteriaModifier) {
            case 'very-strong':
            case 'stand-alone':
                modifiedLevel = '1-up';
                break;
            case 'moderate':
                modifiedLevel = '1-down';
                break;
            case 'supporting':
                modifiedLevel = (getCriteriaType(entry) === 'pathogenic') ? '2-down' : '1-down';
                break;
            default: return null;
        }
    }
    if (entry.criteriaModifier && getCriteriaStrength(entry) === 'moderate') {
        switch (entry.criteriaModifier) {
            case 'very-strong':
                modifiedLevel = '2-up';
                break;
            case 'strong':
                modifiedLevel = '1-up';
                break;
            case 'supporting':
                modifiedLevel = '1-down';
                break;
            default: return null;
        }
    }
    if (entry.criteriaModifier && getCriteriaStrength(entry) === 'supporting') {
        switch (entry.criteriaModifier) {
            case 'very-strong':
                modifiedLevel = '3-up';
                break;
            case 'stand-alone':
                modifiedLevel = '2-up';
                break;
            case 'strong':
                modifiedLevel = (getCriteriaType(entry) === 'pathogenic') ? '2-up' : '1-up';
                break;
            case 'moderate':
                modifiedLevel = '1-up';
                break;
            default: return null;
        }
    }
    return modifiedLevel;
    }
    
    // Function to sort evaluations by criteria strength level
// Sort Order: very strong or stand alone >> strong >> moderate >> supporting
// Input: array, interpretation.evaluations
function sortByStrength(evaluations) {
    console.log('SummaryTable Evals', evaluations)
    // Get all criteria codes
    let criteriaCodes = Object.values(codeStripValues);
    
    let evaluationMet = [];
    let evaluationNotMet = [];
    let evaluationNotEvaluated = [];
    
    for (let evaluation of evaluations) {

        if (evaluation.criteriaStatus === "met") {
            evaluationMet.push(evaluation);
            criteriaCodes.splice(criteriaCodes.indexOf(evaluation.criteria), 1);
        } else if (evaluation.criteriaStatus === 'not-met') {
            evaluationNotMet.push(evaluation);
            criteriaCodes.splice(criteriaCodes.indexOf(evaluation.criteria), 1);
        } else {
            evaluationNotEvaluated.push(evaluation);
            criteriaCodes.splice(criteriaCodes.indexOf(evaluation.criteria), 1);
        }
    }
    
    // Generate object for each untouched criteria
    let untouchedCriteriaObjList = [];
    if (criteriaCodes.length) {
        for (let criterion of criteriaCodes) {
            untouchedCriteriaObjList.push({
                criteria: criterion
            });
        }
    }
    // merge not-evaluated and untouched together
    evaluationNotEvaluated = evaluationNotEvaluated.concat(untouchedCriteriaObjList);
    
    let sortedMetList = [];
    let sortedNotMetList = [];
    let sortedNotEvaluatedList = [];
    
    // sort Met
    if (evaluationMet.length) {
        console.log('eval met', evaluationMet)
        // setup count strength values
        const MODIFIER_VS = 'very-strong';
        const MODIFIER_SA = 'stand-alone';
        const MODIFIER_S = 'strong';
        const MODIFIER_M = 'moderate';
        const MODIFIER_P = 'supporting';
    
        // temp storage
        let vs_sa_level = [];
        let strong_level = [];
        let moderate_level = [];
        let supporting_level = [];
    
        for (let evaluation of evaluationMet) {
            let modified = evaluation.criteriaModifier ? evaluation.criteriaModifier : null;
            if (modified) {
                if (modified === MODIFIER_VS || modified === MODIFIER_SA) {
                    vs_sa_level.push(evaluation);
                } else if (modified === MODIFIER_S) {
                    strong_level.push(evaluation);
                } else if (modified === MODIFIER_M) {
                    moderate_level.push(evaluation);
                } else if (modified === MODIFIER_P) {
                    supporting_level.push(evaluation);
                }
            } else {
                if (evaluation.criteria === 'PVS1' || evaluation.criteria === 'BA1') {
                    vs_sa_level.push(evaluation);
                } else if (evaluation.criteria.charAt(1) === 'S') {
                    strong_level.push(evaluation);
                } else if (evaluation.criteria.charAt(1) === 'M') {
                    moderate_level.push(evaluation);
                } else if (evaluation.criteria.charAt(1) === 'P') {
                    supporting_level.push(evaluation);
                }
            }
        }
    
        if (vs_sa_level.length) {
            sortedMetList = sortedMetList.concat(vs_sa_level);
        }
        if (strong_level.length) {
            sortedMetList = sortedMetList.concat(strong_level);
        }
        if (moderate_level.length) {
            sortedMetList = sortedMetList.concat(moderate_level);
        }
        if (supporting_level.length) {
            sortedMetList = sortedMetList.concat(supporting_level);
        }
    }
    
    // sort Not-Met
    if (evaluationNotMet.length) {
        // temp storage
        let vs_sa_level = [];
        let strong_level = [];
        let moderate_level = [];
        let supporting_level = [];
    
        for (let evaluation of evaluationNotMet) {
            if (evaluation.criteria === 'PVS1' || evaluation.criteria === 'BA1') {
                vs_sa_level.push(evaluation);
            } else if (evaluation.criteria.charAt(1) === 'S') {
                strong_level.push(evaluation);
            } else if (evaluation.criteria.charAt(1) === 'M') {
                moderate_level.push(evaluation);
            } else if (evaluation.criteria.charAt(1) === 'P') {
                supporting_level.push(evaluation);
            }
        }
    
        if (vs_sa_level.length) {
            sortedNotMetList = sortedNotMetList.concat(vs_sa_level);
        }
        if (strong_level.length) {
            sortedNotMetList = sortedNotMetList.concat(strong_level);
        }
        if (moderate_level.length) {
            sortedNotMetList = sortedNotMetList.concat(moderate_level);
        }
        if (supporting_level.length) {
            sortedNotMetList = sortedNotMetList.concat(supporting_level);
        }
    }
    
    //sort Not-Evaluated and untouched
    if (evaluationNotEvaluated.length) {
        // temp storage
        let vs_sa_level = [];
        let strong_level = [];
        let moderate_level = [];
        let supporting_level = [];
    
        for (let evaluation of evaluationNotEvaluated) {
            if (evaluation.criteria === 'PVS1' || evaluation.criteria === 'BA1') {
                vs_sa_level.push(evaluation);
            } else if (evaluation.criteria.charAt(1) === 'S') {
                strong_level.push(evaluation);
            } else if (evaluation.criteria.charAt(1) === 'M') {
                moderate_level.push(evaluation);
            } else if (evaluation.criteria.charAt(1) === 'P') {
                supporting_level.push(evaluation);
            }
        }
    
        if (vs_sa_level.length) {
            sortedNotEvaluatedList = sortedNotEvaluatedList.concat(vs_sa_level);
        }
        if (strong_level.length) {
            sortedNotEvaluatedList = sortedNotEvaluatedList.concat(strong_level);
        }
        if (moderate_level.length) {
            sortedNotEvaluatedList = sortedNotEvaluatedList.concat(moderate_level);
        }
        if (supporting_level.length) {
            sortedNotEvaluatedList = sortedNotEvaluatedList.concat(supporting_level);
        }
    }
    
    const MetList = {
        met: sortedMetList,
        not_met: sortedNotMetList,
        not_evaluated: sortedNotEvaluatedList
    }
    console.log('met list', MetList, sortedMetList)
    return MetList;
    }
}

export default SummaryTable;
