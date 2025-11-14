import React from 'react';
import { getEvidenceAuthors } from '../../helpers/getEvidenceAuthors';
import { ExternalLink } from "../common/ExternalLink";
import { EXTERNAL_API_MAP } from "../../constants/externalApis";
import EarliestPubIcon from './EarliestPubIcon';

export const EvidenceSourceDetail = ({
    evidence
}) => {

    const renderPmid = () => {
        const authors = getEvidenceAuthors(evidence);

        return (
            <span>
                {authors
                    ? authors
                    : "No authors listed"}, <strong>{evidence?.pubYear}</strong>, <ExternalLink 
                          href={`${EXTERNAL_API_MAP['PubMed']}${evidence?.pmid}`}>
                          <strong>PMID</strong>: {evidence?.pmid}
                      </ExternalLink> {evidence?.earliestPub
                          ? <EarliestPubIcon />
                          : null}
            </span>
        );
    };

    const renderSCV = () => {
        return (
            <span>
                {evidence?.submitter
                    ? evidence?.submitter
                    : "No submitter"}, <strong>{evidence?.pubYear}</strong>, <ExternalLink
                          href={`${EXTERNAL_API_MAP['ClinVarSearch']}${evidence?.vcvId}`}>
                          <strong>ClinVar</strong>: {evidence?.scvId}
                      </ExternalLink> {evidence?.earliestPub
                          ? <EarliestPubIcon />
                          : null}
            </span>
        );
    };

    return (
        <>
            {evidence?.pmid && renderPmid()}
            {evidence?.vcvId && evidence?.scvId && renderSCV()}
        </>
    );
};
