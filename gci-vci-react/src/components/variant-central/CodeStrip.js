import React, {useEffect, useState} from 'react';
import $ from 'jquery';
import {codeStripValues} from './mapping/CodeStripValues';

function CodeStrip(props) {

    const [evaluations, setEvaluations] = useState(null);

    useEffect(()=>{

        setEvaluations(props.evaluations); // Bind evaluations prop to state

        // Enables Tooltip via Bootstrap 
        // We should replace with React-Bootstrap when time allows (and remove jQuery)
        $(function () {
            $('[data-toggle="tooltip"]').tooltip({
                trigger : 'hover'
            })
        })
    }, [props.evaluations])

    const bannerElement = document.getElementById('non-prod-banner');
    const codeStripStyle = bannerElement ? {top: (bannerElement.offsetHeight - 1) + 'px'} : {top: '-1px'};

    const setTabHandler = (index, code, subIndex) => {
        props.onSetTab(index, code, subIndex);
    }
    
    if (codeStripValues){
        return(
            <div className="btn-group flex-wrap code-strip" style={codeStripStyle} role="group" aria-label="Code Strip Buttons">
                {codeStripValues.map((code, id) => 
                    <button className={`btn btn-sm btn-outline-primary ${code.class} 
                        ${evaluations && getButtonClass(evaluations[code.code].criteriaStatus)}`}  
                        key={id} type="button" data-toggle="tooltip" 
                        data-html="true" title={code.definition}
                        onClick={() => setTabHandler(code.tabIndex, code.code, code.subTabIndex)}>
                        {code.code}
                    </button>
                )}
            </div>
        )
    }
}

// Return corresponding button class based on Met, Not Met, etc.
const getButtonClass = (status) => {
    if (status === "met"){
        return "is-active";
    }
    if (status === "not-met"){
        return "is-not-met";
    }
    return "" 
}

export default CodeStrip;