import React, {useState, useEffect} from 'react';

const PathogenicityCalculator = (props) => {

    const [evaluations, setEvaluations] = useState([]);
    const [calculatedResult, setCalculatedResult] = useState('');

    useEffect(()=>{
        setEvaluations(props.evaluations);
        if (evaluations){
            let result = calculatePathogenicity(evaluations);
            if (result){
                setCalculatedResult(result);
                if (result.assertion){
                    props.setCalculatedPathogenicity(result.assertion);
                }
                
            }
        }
        
    }, [props, props.evaluations, evaluations])

    // Sets calculatedResult by checking current evaluations
    function calculatePathogenicity(evaluationObjList) {
        // setup count values
        const MET = 'met'; 
        const NOT_MET = 'not-met';
        //const NOT_EVALUATED = 'not-evaluated';
        const MODIFIER_VS = 'very-strong';
        const MODIFIER_S = 'strong';
        const MODIFIER_M = 'moderate';
        const MODIFIER_P = 'supporting';
        const MODIFIER_SA = 'stand-alone';

        let result = null;

        if (evaluationObjList && evaluationObjList.length) {
            let evaluated = false;

            // Initialize count numbers
            let pvs_count = 0;
            let ps_count = 0;
            let pm_count = 0;
            let pp_count = 0;
            let ba_count = 0;
            let bs_count = 0;
            let bp_count = 0;
            // count each criteria level (PVS, PS, PM, PP, BA, BS, BP)
            for (let evaluationObj of evaluationObjList) {
                
                // In each evaluation object, criteria and criteriaStatus must exist, criteriaModifier may or may not
                let criteria = evaluationObj.criteria;
                let criteriaStatus = evaluationObj.criteriaStatus;
                // count met criteria only, modified by criteriaModifier
                if (criteriaStatus === MET) {
                    evaluated = true;

                    let criteriaModifier = evaluationObj.criteriaModifier;
                    if ((criteria.startsWith('PVS') && !criteriaModifier)
                        || (criteria.startsWith('P') && criteriaModifier === MODIFIER_VS)) {
                        pvs_count += 1;
                    } else if ((criteria.startsWith('PS') && !criteriaModifier)
                        || (criteria.startsWith('P') && criteriaModifier === MODIFIER_S)) {
                        ps_count += 1;
                    } else if ((criteria.startsWith('PM') && !criteriaModifier)
                        || (criteria.startsWith('P') && criteriaModifier === MODIFIER_M)) {
                        pm_count += 1;
                    } else if ((criteria.startsWith('PP') && !criteriaModifier)
                        || (criteria.startsWith('P') && criteriaModifier === MODIFIER_P)) {
                        pp_count += 1;
                    } else if ((criteria.startsWith('BA') && !criteriaModifier)
                        || (criteria.startsWith('B') && criteriaModifier === MODIFIER_SA)) {
                        ba_count += 1;
                    } else if ((criteria.startsWith('BS') && !criteriaModifier)
                        || (criteria.startsWith('B') && criteriaModifier === MODIFIER_S)) {
                        bs_count += 1;
                    } else if ((criteria.startsWith('BP') && !criteriaModifier)
                        || (criteria.startsWith('B') && criteriaModifier=== MODIFIER_P)) {
                        bp_count += 1;
                    }
                } else if (criteriaStatus === NOT_MET) {
                    evaluated = true;
                }
            }

            let contradict = ((pvs_count > 0 || ps_count > 0 || pm_count > 0 || pp_count > 0) && (ba_count > 0 || bs_count > 0 || bp_count > 0)) ? true : false;
            let patho_assertion = null;
            let benign_assertion = null;

            // Algorithm, ACMG Standarts & Guidelines 2015
            // setup cases for 4 types of assertions (Pathogenic, Likely pathogenic, Benign and Likely benign)
            let cases = {
                path_pvs2: pvs_count >= 2 ? true : false,
                path_pvs1_ps1: (pvs_count === 1 && ps_count >= 1) ? true : false,
                path_pvs1_pm2: (pvs_count === 1 && pm_count >= 2) ? true : false,
                path_pvs1_pm1_pp1: (pvs_count === 1 && pm_count === 1 && pp_count === 1) ? true : false,
                path_pvs1_pp2: (pvs_count === 1 && pp_count >= 2) ? true : false,
                path_ps2: ps_count >= 2 ? true : false,
                path_ps1_pm3: (ps_count === 1 && pm_count >= 3) ? true : false,
                path_ps1_pm2_pp2: (ps_count === 1 && pm_count === 2 && pp_count >= 2) ? true : false,
                path_ps1_pm1_pp4: (ps_count === 1 && pm_count === 1 && pp_count >= 4) ? true : false,

                likelyPath_pvs1_pm1: (pvs_count === 1 && pm_count === 1) ? true : false,
                likelyPath_ps1_pm1: (ps_count === 1 && (pm_count === 1 || pm_count === 2)) ? true : false,
                likelyPath_ps1_pp2: (ps_count === 1 && pp_count >= 2) ? true : false,
                likelyPath_pm3: pm_count >= 3 ? true : false,
                likelyPath_pm2_pp2: (pm_count === 2 && pp_count >= 2) ? true : false,
                likelyPath_pm1_pp4: (pm_count === 1 && pp_count >= 4) ? true : false,

                benign_ba1: ba_count >= 1 ? true : false,
                benign_bs2: bs_count >= 2 ? true : false,

                likelyBenign_bs1_pp1: (bs_count === 1 && bp_count === 1) ? true : false,
                likelyBenign_pp2: (bp_count >= 2) ? true : false,
            };

            for (let cs of Object.keys(cases)) {
                if (cases[cs]) {
                    if (cs.indexOf('path_') !== -1) {
                        patho_assertion = 'Pathogenic';
                    } else if (cs.indexOf('likelyPath_') === 0 && !patho_assertion) {
                        patho_assertion = 'Likely pathogenic';
                    }

                    if (cs.indexOf('benign_') !== -1) {
                        benign_assertion = 'Benign';
                    } else if (cs.indexOf('likelyBenign_') === 0 && !benign_assertion) {
                        benign_assertion = 'Likely benign';
                    }
                }
            }

            let assertion = null;
            if (!evaluated) {
                assertion = '';
            } else if ((patho_assertion && contradict) || (benign_assertion && contradict)) {
                assertion = 'Uncertain significance - conflicting evidence';
            } else if (patho_assertion && !contradict) {
                assertion = patho_assertion;
            } else if (benign_assertion && !contradict) {
                assertion = benign_assertion;
            } else {
                assertion = 'Uncertain significance - insufficient evidence';
            }

            result = {
                assertion: assertion,
                path_summary: {},
                benign_summary: {}
            };

            if (pvs_count > 0) {
                result.path_summary['Very strong'] = pvs_count;
            }
            if (ps_count > 0) {
                result.path_summary['Strong'] = ps_count;
            }
            if (pm_count > 0) {
                result.path_summary['Moderate'] = pm_count;
            }
            if (pp_count > 0) {
                result.path_summary['Supporting'] = pp_count;
            }
            if (ba_count > 0) {
                result.benign_summary['Stand alone'] = ba_count;
            }
            if (bs_count > 0) {
                result.benign_summary['Strong'] = bs_count;
            }
            if (bp_count > 0) {
                result.benign_summary['Supporting'] = bp_count;
            }
        }
        return result;
    }
        
    return (
        <div>
            {evaluations ?
                <div className="row progress-bar-area">
                    <div className="col-sm-4 benign-box">
                        <dl className="benign-result">
                            <dt>Benign</dt>
                            <dd>
                                {calculatedResult && calculatedResult.benign_summary && Object.keys(calculatedResult.benign_summary).length ?
                                    Object.keys(calculatedResult.benign_summary).map((criteria, i) => {
                                        return (
                                            <span key={i} className="criteria-strength">
                                                {criteria + ': '}
                                                <span className="badge">{calculatedResult.benign_summary[criteria]}</span>
                                                {i < 2 ? <span>&nbsp;&nbsp;&nbsp;</span> : null}
                                            </span>
                                        );
                                    })
                                    :
                                    'No criteria met'
                                }
                            </dd>
                        </dl>
                    </div>
                    <div className="col-sm-4 path-box">
                        <dl className="path-result">
                            <dt>Pathogenic</dt>
                            <dd>
                                {calculatedResult && calculatedResult.path_summary && Object.keys(calculatedResult.path_summary).length ?
                                    Object.keys(calculatedResult.path_summary).map((criteria, i) => {
                                        return (
                                            <span key={i} className="criteria-strength">
                                                {criteria + ': '}
                                                <span className="badge">{calculatedResult.path_summary[criteria]}</span>
                                                {i < 3 ? <span>&nbsp;&nbsp;&nbsp;</span> : null}
                                            </span>
                                        );
                                    })
                                    :
                                    'No criteria met'
                                }
                            </dd>
                        </dl>
                    </div>
                    <div className="col-sm-4 assertion-box">
                            <dl className="calculate-result">
                            <dt>Auto-calculated Classification</dt>
                            <dd>{calculatedResult && calculatedResult.assertion ? calculatedResult.assertion : 'None'}</dd>
                        </dl>
                    </div>
                </div>
                :
                null
            }
        </div>
    );
}

export default PathogenicityCalculator;