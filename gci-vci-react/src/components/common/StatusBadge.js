import React from 'react';
import PropTypes from "prop-types";

const badges = {
    "In Progress": "warning",  // TODO: remove after standardize db status data
    "in progress": "warning",
    "Approved": "success",
    "approved": "success",
    "Provisional": "info",
    "provisional": "info",
    "Provisioned": "info", // TODO: remove after standardize db status data
    "provisioned": "info", // TODO: remove after standardize db status data
    "Published": "published",
    "published": "published",
    "Unpublished": "unpublished",
    "unpublished": "unpublished",
    "new saved summary": "new-saved-summary"
}

// Badge used to show color-coded "In Progress", "Provisioned", "Approved", "Published" status
function StatusBadge(props) {
    const {label, className} = props;

    // Convert "provisioned" status to display as "provisional"
    let adjustedLabel = label.toLowerCase();
    if (adjustedLabel === "provisioned"){
        adjustedLabel = "provisional"
    }

    // match badgeType to label using above dictionary. If no status, give same as none.
    let badgeType = badges[adjustedLabel] || "light";

    return (
        <span className={`badge badge-${badgeType} ${className ? className : ''}`}>{adjustedLabel.toUpperCase()}</span>
    );
}
StatusBadge.propTypes = {
    label: PropTypes.oneOf(Object.keys(badges))
}
export default StatusBadge;
