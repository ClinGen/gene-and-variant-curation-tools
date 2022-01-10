import React, {useEffect, useState} from 'react';
import CardPanel from './common/CardPanel';
import Alert from './common/Alert';
import LoadingSpinner from './common/LoadingSpinner';
import {compareFormGroupValues, scrollIDIntoView} from './variant-central/helpers/helpers';
import { useIsMyInterpretation } from '../utilities/ownershipUtilities';

// Evaluation Form
function EvaluationForm(props) {

    const {
        criteria,
        criteriaGroups,
        cspecCriteria,
        evaluations,
        selectChange,
        textChange,
        onSubmitEval,
        alert,
        title,
        subTitle,
        className, 
        disabled = false,
        criteriaCrossCheck,
    } = props;

    
    const [groupedCriteria, setGroupedCriteria] = useState([]); // Array of criteria objects, by group
    const [formAlert, setFormAlert] = useState("");
    const [loading, setLoading] = useState(false);
    const isMyInterpretation = useIsMyInterpretation();

    useEffect(() => {
        setLoading(props.loading);
        // Break criteria objects into grouped arrays
        const groupCriteriaObjects = (groups) => {
            setGroupedCriteria([])
            groups.forEach((group, i) => {
                const tempArray = [];
                group.forEach(item => {
                    criteria.forEach(object => {
                        if (object.code === item){
                          // Add CSpec link to criteria obj if available for respective criteria
                          if (cspecCriteria && cspecCriteria.length) {
                            cspecCriteria.forEach(doc => {
                              if (doc.code === object.code) {
                                object.cspecLink = doc.criteriaCodeUiLink;
                              }
                            });
                          } else {
                            object.cspecLink = null; // if no cspec, remove any stale links from criteria
                          }
                            tempArray.push(object)
                        }
                    });
                })
                setGroupedCriteria(groupedCriteria => [...groupedCriteria, tempArray]);
            })
        }
        if(criteriaGroups){
            groupCriteriaObjects(criteriaGroups);
        }

        // Scroll user to active criteria/evaluation form object, offset by 50px
        if (props.activeCode){
            scrollIDIntoView(props.activeCode);
        }

    },[criteriaGroups, criteria, props.loading, props.activeCode])

    
    const selectChangeHandler = (e, code) =>{
        selectChange(e, code);
    }

    const textChangeHandler = (e, code) =>{
        textChange(e, code);
    }

    const submitEvaluationHandler = (e, values, groups) =>{
        e.preventDefault();
        if (compareFormGroupValues(values, groups)){
            setFormAlert({
                type: "danger",
                message: 'Only one of the criteria can have a value other than "Not Met" or "Not Evaluated"',
            })
            setLoading(false)
        }
        if (!compareFormGroupValues(values, groups)){
            setFormAlert({})
        }
        onSubmitEval(e, values, groups);
    }

    
    if (groupedCriteria){
        return isMyInterpretation ? (
            <section className={`mb-5 ${className || ""}`}>
                <h2>{title}</h2>
                <p className="lead text-secondary">{subTitle}</p>

                <form className="mb-3">

                    {groupedCriteria.map((groupedCriteriaObject, index) => 

                    <div key={index} className="mb-3">

                        {(index ? <div className="or-separator">OR</div> : '')}

                        {groupedCriteriaObject.map((criteria, id) => 
                        <section key={id} id={evaluations[criteria.code].criteria}>
                            <CardPanel 
                                badge={criteria.diseaseDependent? "Disease-specific" : ""} 
                                title={criteria.definitionLong} 
                                label={criteria.code}
                                labelClass={criteria.class}
                                panelMarginClass="mb-3"
                                headerLink={criteria.cspecLink ? {url: criteria.cspecLink, label: `Criteria Specification for ${criteria.code}`} : null}
                            >
                                    <div className="row">
                                        <div className="col-sm-4">
                                            <select className="form-control" value={
                                                    evaluations[criteria.code].criteriaStatus !== 'met' ? 
                                                        (evaluations[criteria.code].criteriaStatus === 'not-met' ? 'not-met' : 'not-evaluated') 
                                                    : (!evaluations[criteria.code].criteriaModifier ? 'met' : evaluations[criteria.code].criteriaModifier)
                                                } disabled={disabled} name={criteria.code} onChange={(e)=>selectChangeHandler(e, criteria.code)}>
                                                <option value="not-evaluated">Not Evaluated</option>
                                                <option value="met">Met</option>
                                                <option value="not-met">Not Met</option>
                                                {criteria.code.charAt(1) === 'P' ? null : <option value='supporting'>{criteria.code}_Supporting</option>}
                                                {criteria.code.charAt(0) === 'P' && criteria.code.charAt(1) !== 'M' ? <option value='moderate'>{criteria.code}_Moderate</option> : null}
                                                {criteria.code.charAt(1) === 'S' ? null : <option value='strong'>{criteria.code}_Strong</option>}
                                                {(criteria.code.charAt(0) === 'B' && criteria.code.charAt(1) !== 'A') ? <option value='stand-alone'>{criteria.code}_Stand-alone</option> : null}
                                                {(criteria.code === 'PS2' || criteria.code === 'PM3') ? <option value='very-strong'>{criteria.code}_Very strong</option> : null}
                                            </select>
                                        </div>
                                        <div className="col-sm-8">
                                            <textarea placeholder="Explanation" className="form-control" disabled={disabled} name={criteria.code} 
                                                onChange={(e)=>textChangeHandler(e, criteria.code)}
                                                value={evaluations[criteria.code].explanation}
                                            />
                                        </div>
                                    </div>
                            </CardPanel>
                        </section>
                        )}
                    </div>
                    )}

                    {(alert && alert.message ?
                        <Alert id={props.title} value={alert.message} type={alert.type} dismissible className="will-disappear"/> 
                    : "")}

                    {(formAlert && formAlert.message ?
                        <Alert value={formAlert.message} type={formAlert.type} dismissible className="mt-3"/> 
                    : "")}
                    
                    <div className="row">
                        <div className="col-sm-6 offset-sm-3">
                            <button 
                                onClick={(e)=>submitEvaluationHandler(e, evaluations, criteriaCrossCheck || criteriaGroups)} 
                                className="btn btn-primary btn-lg btn-block mt-3">
                                    {!loading ? <span>Save</span> : <LoadingSpinner size="lg"/>}
                            </button>
                        </div>
                    </div>
                </form>
                
            </section>
        ) : (
            // when it's not our interpretation, do not display evaluation form
            // (this is the same behavior as legacy website)
            <></>
        );
    }
    

    
}
export default EvaluationForm;
