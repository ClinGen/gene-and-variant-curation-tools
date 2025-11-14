// This form is a list of checkboxes in the Publish panel of the interfaces. 
// Users must select an option before moving to "Preview Publish".
import React, { useEffect, useState } from "react";

import Input from "./Input";
import Popover from "./Popover";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { Row, Col } from "react-bootstrap";

/**
 * @param {Array} checkedState - Array of boolean values representing selected checkbox inputs
 * @param {Object} curationReasons - Selected curation reasons and additional comments
 * @param {Object} reasonsFormErrors - Curation reason form errors
 * @returns {JSX.Element}
 */
export const CurationReasonsForm = ({ checkedState, clearErrors, curationReasons, reasonsFormErrors, setCurationReasons, setCheckedState }) => {
  const NEW_CURATION_NAME = "New Curation";
  const checkboxFields = [
    {
      name: NEW_CURATION_NAME,
      helpText: "The first time a classification will be published for this record.",
      value: "New Curation"
    },
    {
      name: "Recuration: New Evidence",
      helpText: "New evidence was evaluated since this classification was last published.",
      value: "Recuration New Evidence"
    },
    {
      name: "Recuration: Community Request",
      helpText: "The curation was reevaluated at the request of a user (either internal or external to ClinGen).",
      value: "Recuration Community Request"
    },
    {
      name: "Recuration: Error (affecting score and/or classification)",
      helpText: "An error resulted in incorrect scoring and/or classification, prompting reevaluation.",
      value: "Recuration Error affecting score and or classification"
    },
    {
      name: "Recuration: Due to Timing",
      helpText: "A specific amount of time has passed (per recuration guidance), requiring reevaluation of the currently approved version.",
      value: "Recuration Due to Timing"
    },
    {
      name: "Recuration: Discrepancy Resolution",
      helpText: "A conflict with another group (e.g. ClinVar submitters for VCEPs, GenCC submitters for GCEPs) prompted reevaluation.",
      value: "Recuration Discrepancy Resolution"
    },
    {
      name: "Recuration: Framework Change",
      helpText: "The curation was reevaluated to be consistent with a newer version of the curation framework (e.g. SOP, specification, etc.).",
      value: "Recuration Framework Change"
    },
    {
      name: "Administrative Update: Disease Name Update",
      helpText: "There was an update to the disease term that does not change the overall scope of the original curation, e.g. Mondo updates.",
      value: "Adminstrative Update Disease Name Update"
    },
    {
      name: "Administrative Update: Error/Clarification",
      helpText: "This category includes administrative changes that do not change the overall classification and do not require rereview by the group, such as typo corrections, the addition of clarifying language to free text fields, adding contributors, etc.",
      value: "Administrative Update Error Clarification"
    }
  ];

  const [isNewCuration, setIsNewCuration] = useState(false);

  useEffect(() => {
    const prevSelectedReasons = checkedState.map((reason, i) => {
      if (reason === true) {
        return checkboxFields[i].name;
      }
    });

    if (prevSelectedReasons && prevSelectedReasons[0] === NEW_CURATION_NAME) {
      setIsNewCuration(true);
    }
  }, []);

  const handleChange = (position) => {
    const updatedCheckedState = checkedState.map((unchecked, index) => 
      index === position ? !unchecked : unchecked
    );

    setCheckedState(updatedCheckedState);
    const selectedReasons = updatedCheckedState.map((reason, i) => {
      if (reason === true) {
        return checkboxFields[i].value;
      }
    });

    if (selectedReasons && selectedReasons[0] === NEW_CURATION_NAME) {
      setIsNewCuration(true);
      // remove any additional items, validate checkedState if user checked other options then checked New Curation
      selectedReasons.splice(1);
      const validatedCheckedState = updatedCheckedState.map((item, i) => {
        if (i !== 0) {
          return false;
        }
        return item;
      });
      setCheckedState(validatedCheckedState);
    } else {
      setIsNewCuration(false);
    }

    const reasons = selectedReasons.filter(i => {
      return i !== undefined;
    });

    setCurationReasons(reasons);
    clearErrors();
  };

  const curationReasonsHelpText = () => {
    const vciHelpDocLink = "https://vci-gci-docs.clinicalgenome.org/vci-gci-docs/vci-help/publishing-from-the-vci/publishing-to-the-erepo";
    const gciHelpDocLink = "https://vci-gci-docs.clinicalgenome.org/vci-gci-docs/gci-help/publishing-an-approved-gene-disease-record";
    return (
      <>
        See <a href={vciHelpDocLink} target="_blank" rel="noreferrer">VCI</a> and <a href={gciHelpDocLink} target="_blank" rel="noreferrer">GCI</a> help documentation for 
        instructions about this section.
      </>
    )
  };

  return (
    <>
      <Row className="ml-0">
        <h4>Reason(s) for Publishing Classification</h4>
        <span className="col-sm-4">
          <Popover
            triggerComponent={<FontAwesomeIcon className="text-info" icon={faInfoCircle}/>}
            delay={{ hide: 3000 }}
            content={curationReasonsHelpText()}
            placement="top"
          />
        </span>
        <div className="mb-3">In the case of recuration and/or administrative updates, select all that apply:</div>
      </Row>
      {checkboxFields.map((input, i) => {
        return (
          <Row className="mb-3" key={i}>
            <Col>
              <Input type="checkbox" disabled={isNewCuration && input.name !== NEW_CURATION_NAME}
                name={input.name} onChange={() => handleChange(i)} value={input.value} checked={checkedState[i]}
              >
              </Input>
              <span className="col-sm-4 control-label">{input.name}</span>
              <Popover
                triggerComponent={<FontAwesomeIcon className="text-info" icon={faInfoCircle}/>}
                content={input.helpText}
                placement="top"
              />
            </Col>
          </Row>
        );
      })}
      <div className="submit-err">{reasonsFormErrors ? reasonsFormErrors['error'] : null}</div>
    </>
  );
};