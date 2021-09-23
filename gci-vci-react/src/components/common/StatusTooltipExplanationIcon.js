import React from "react";
import PropTypes from "prop-types";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";


/**
 * Component to render a mouseover explanation for the 'all classifications and interpretations' panel titles.
 */
export const StatusTooltipExplanationIcon = ({ resourceType, ...props }) => {
  let toolTipText = '';
  if (resourceType === 'Classifications') {
      toolTipText = `${resourceType} marked as "Approved" or "Provisional" may be viewed by any user within the interface; those marked as "In progress" are viewable only by the submitter.`;
  } else {
      toolTipText = `${resourceType} marked as "Approved" may be viewed by any user within the interface; those marked as "In progress" or "Provisional" mare viewable only by the submitter.`;
  }

  return (
    <OverlayTrigger
      overlay={
        <Tooltip>
          {toolTipText}
        </Tooltip>
      }
    >
      <FontAwesomeIcon icon={faInfoCircle} color="#007bff" {...props} />
    </OverlayTrigger>
  );
};
StatusTooltipExplanationIcon.propTypes = {
  resourceType: PropTypes.oneOf(["Classifications", "Interpretations"]),
};
