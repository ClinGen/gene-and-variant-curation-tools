import React from 'react';
import PropTypes from 'prop-types';
import { ExternalLink } from "../ExternalLink";
import { EXTERNAL_API_MAP } from "../../../constants/externalApis";

const ClinVarSummary = ({
    scv,
    showComment=false,
    linkout=true,
    linkoutOnNewLine=true,
}) => {
    if (scv && Object.keys(scv).length) {
        const scvId = scv?.scvId;
        const scvVersion = scvId?.substring(scvId?.indexOf(".")+1, scvId?.length);

        return (
            <>
                <p className="mb-0">
                    Submitter: {scv?.submitter}
                </p>
                <p className="mb-0">
                    Variant: {scv?.variationName}
                </p>
                {showComment && scv?.comment &&
                    <p className="mb-0">
                        Comment: {scv?.comment}
                    </p>
                }
                <p className="mb-0">
                    {
                        scv?.date ? <><strong>Last updated: {scv?.date}</strong></> : null
                    }
                </p>
                <p>
                    Version {scvVersion}
                    {linkout && !linkoutOnNewLine && <span>&nbsp;
                        <ExternalLink
                            href={`${EXTERNAL_API_MAP['ClinVarSearch']}${scv?.vcvId}`}
                            title={`ClinVar record for ${scv?.vcvId} in new tab`}>
                            {scvId} ({scv?.vcvId})
                        </ExternalLink>
                    </span>}
                </p>
                {linkout && linkoutOnNewLine && <p className="mb-0">
                    <span>
                        <ExternalLink
                            href={`${EXTERNAL_API_MAP['ClinVarSearch']}${scv?.vcvId}`}
                            title={`ClinVar record for ${scv?.vcvId} in new tab`}>
                            {scvId} ({scv?.vcvId})
                        </ExternalLink>
                    </span>
                </p>}
            </>
        );
    } else {
        return null;
    }
};

ClinVarSummary.propTypes = {
    // show a external link for the SCV
    linkout: PropTypes.bool,
    // let the SCV external link be in new line
    linkoutOnNewLine: PropTypes.bool
}

export default ClinVarSummary;
