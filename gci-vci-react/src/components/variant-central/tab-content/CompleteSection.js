import React, { useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RestAPI as API } from "@aws-amplify/api-rest";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import Input from "../../common/Input";
import { API_NAME } from "../../../utils";
import { useAmplifyAPIRequestRecycler } from "../../../utilities/fetchUtilities";
import { updateInterpretation } from "../../../actions/actions";

var tabData = {
  'population': {
    name: 'Population',
    tabIndex: 1
  },
  'variant-type': {
    name: 'Variant Type',
    tabIndex: 2
  },
  'experimental': {
    name: 'Experimental',
    tabIndex: 3
  },
  'segregation-case': {
    name: 'Case/Segregation',
    tabIndex: 4
  }
};

export const CompleteSection = ({
  tabName,
  updateTab,
}) => {

  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [submitErrorMessage, setSubmitErrorMessage] = useState(null);

  const requestRecycler = useAmplifyAPIRequestRecycler();

  // bring in interpretation from redux
  const dispatch = useDispatch();
  const interpretation = useSelector((state) => state.interpretation);
  const auth = useSelector((state) => state.auth);
  const setInterpretation = useCallback(
    (i) => dispatch(updateInterpretation(i)),
    [dispatch]
  );

  const handleSubmitError = (error) => {
    let errorDetailMessage;

    if (error instanceof Error) {
      errorDetailMessage = error.message;
    } else if (typeof error === "string") {
      errorDetailMessage = error;
    } else {
      errorDetailMessage = JSON.stringify(error);
    }
    setSubmitErrorMessage(
      `Something went wrong whlie trying to save interpretation: ${errorDetailMessage}`
    );
    setIsSubmitting(false);
  };

  const submitCompleteSection = async () => {
    setIsSubmitting(true);
    setSubmitErrorMessage(null);

    // submit interpretation to DB

    // handle when field `completed_sections` is undefined
    let putInterpretation = interpretation;
    if (!Array.isArray(putInterpretation.completed_sections)) {
      // putInterpretation.curated_evidence_list = [];
      // make sure we don't mutate redux state object `interpretation` directly
      putInterpretation = {
        ...interpretation,
        completed_sections: [],
      };
    }

    // If checked, add tabname to array; otherwise, remove tabName from array 
    if (putInterpretation.completed_sections.indexOf(tabName) === -1) {
      putInterpretation.completed_sections.push(tabName);
    } else {
      putInterpretation.completed_sections.splice(putInterpretation.completed_sections.indexOf(tabName), 1);
    }

    putInterpretation.modified_by = auth ? auth.PK : null;

    // PUT interpretation
    try {
      const putResultInterpretation = await requestRecycler.capture(API.put(
        API_NAME,
        `/interpretations/${putInterpretation.PK}`,
        { body: { putInterpretation } }
      ));
      if (!putResultInterpretation) {
        throw new Error("Server responded null");
      }
    } catch (error) {
      if (API.isCancel(error)) {
        return;
      }
      handleSubmitError(error);
      return;
    }

    setIsSubmitting(false);
    updateTab(tabData[tabName].tabIndex);

    // update UI interpretation
    // after redux interpretation updated, this component will be unmounted
    // so make sure no further local state operation after this; otherwise will get error 'state update after unmount;
    setInterpretation(putInterpretation);
  };

  const checked = interpretation.completed_sections && interpretation.completed_sections.indexOf(tabName) > -1 ? true : false;
  return (
    <div className="alert alert-warning section-complete-bar">
      The evaluations on the {tabData[tabName].name} tab have been reviewed to my satisfaction (<i>optional</i>) <Input type="checkbox" onChange={submitCompleteSection} disabled={isSubmitting} checked={checked} /> {isSubmitting ? <span><FontAwesomeIcon icon={faSpinner} spin /> Submitting</span> : null}
      <div className="submit-err">{submitErrorMessage}</div>
    </div>
  );
};
