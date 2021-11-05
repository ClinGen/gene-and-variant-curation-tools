import React from "react";
import PropTypes from 'prop-types';
import isEmpty from 'lodash/isEmpty';

import {
    BasicInfoTranscriptTableView,
    PrimaryTranscriptTableView,
    ClinvarSubmittedInterpretationSCVsTableView,
    ClinvarInterpretationSummaryTableView,
    VciInterpretationTableView,
    VariantGenomicContext,
    BrcaLink,
    CivicLink,
    BasicInfoLovdTableView,
} from "./BasicInfoTables";
import CardPanel from "../../common/CardPanel";
import Alert from "../../common/Alert";
import { LoadingStatusValues, LoadingStatus } from "../../../utilities/fetchUtilities";
import { Link } from "react-router-dom";
import { EXTERNAL_API_MAP } from "../../../constants/externalApis";
import { renderDataCredit } from "../helpers/credit";
import { StatusTooltipExplanationIcon } from "../../common/StatusTooltipExplanationIcon";
import { ExternalLink } from "../../common/ExternalLink";


const RichEnsemblVEPTitle = (props) => {
    return (
        <>
            {props.text}
            <a href="#credit-vep-basic-info" className="credit-vep" title="VEP">
                <span>VEP</span>
            </a>
        </>
    );
};


const RelatedVciInterpretations = () => {
    return (
        <div className="d-flex align-items-center">
            All interpretations for this variant in the Variant Curation Interface (VCI) {' '}
            <StatusTooltipExplanationIcon className="ml-1" resourceType="Interpretations" />
        </div>
    )
}


export const BasicInfoTabView = ({
    GRCh37, 
    GRCh38,
    basicInfoTabExternalAPIErrorMessage,
    ...props
}) => {
    const clinvarLink = props.clinvarVariantId && props.basicInfoTabExternalAPILoadingStatus === LoadingStatus.SUCCESS ?
        <small><Link to={{ pathname: EXTERNAL_API_MAP['ClinVarSearch'] + props.clinvarVariantId }} target="_blank">See data in ClinVar</Link></small>:
        null;
    
    return (
        <div className="basic-info">
            <CardPanel
                title={<RelatedVciInterpretations />}
            >
                <VciInterpretationTableView 
                    loadingStatus={props.basicInfoTabInternalAPILoadingStatus}
                    relatedInterpretationsSnapshots={props.relatedInterpretationsSnapshots}
                    data={props.internalAPIData}
                />
            </CardPanel>


            {(props.basicInfoTabExternalAPILoadingStatus === LoadingStatus.LOADING) ||
            (props.basicInfoTabExternalAPILoadingStatus !== LoadingStatus.ERROR && !isEmpty(props.externalAPIData)) ?
                <>
                    <CardPanel
                        title="Overall ClinVar Interpretation"
                        renderHeaderTail={clinvarLink}
                    >
                        <ClinvarInterpretationSummaryTableView
                            loadingStatus={props.basicInfoTabExternalAPILoadingStatus}
                            data={props.externalAPIData.clinvarInterpretationSummary}
                        />
                    </CardPanel>

                    <CardPanel
                        title="Interpretations Submitted to ClinVar (Germline SCVs only)"
                        renderHeaderTail={clinvarLink}
                    >
                        <ClinvarSubmittedInterpretationSCVsTableView
                            basicInfoTabExternalAPILoadingStatus={props.basicInfoTabExternalAPILoadingStatus}
                            data={props.externalAPIData.clinvarInterpretationSCVs}
                        />
                    </CardPanel>

                    <CardPanel title="ClinVar Primary Transcript">
                        <PrimaryTranscriptTableView
                            basicInfoTabExternalAPILoadingStatus={props.basicInfoTabExternalAPILoadingStatus}
                            data={props.externalAPIData.primaryTranscripts}
                            clinvarVariantId={props.clinvarVariantId}
                        />
                    </CardPanel>

                    <CardPanel title="Other Evidence Resources">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Resource</th>
                            <th>Link to variant in resource</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Leiden Open Variation Database (LOVD)</td>
                            <td>
                              <BasicInfoLovdTableView
                                lovdLink={props.lovdLink}
                                loadingLovd={props.isLoadingLovd}
                              />
                            </td>
                          </tr>
                          <tr>
                            <td>Clinical Interpretation of Variants in Cancer (CIViC)</td>
                            <td>
                              <CivicLink
                                civicData={props.civicData}
                                loadingCivic={props.isLoadingCivic}
                              />
                            </td>
                          </tr>
                          <tr>
                            <td>BRCA Exchange</td>
                            <td>
                              <BrcaLink 
                                hasBrcaData={props.hasBrcaData}
                                carId={props.carId}
                                loadingBrca={props.isLoadingBrca}
                              />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                        
                    </CardPanel>

                    <CardPanel title={<RichEnsemblVEPTitle text="RefSeq Transcripts" />}>
                        <BasicInfoTranscriptTableView
                            data={props.externalAPIData.refSeqTranscripts}
                            loadingStatus={props.basicInfoTabExternalAPILoadingStatus}
                        />
                    </CardPanel>

                    <CardPanel title={<RichEnsemblVEPTitle text="Ensembl Transcripts" />}>
                        <BasicInfoTranscriptTableView
                            data={props.externalAPIData.ensemblTranscripts}
                            loadingStatus={props.basicInfoTabExternalAPILoadingStatus}
                        />
                    </CardPanel>
                </> : 
                props.basicInfoTabExternalAPILoadingStatus === LoadingStatus.ERROR ? (
                    <Alert className="mb-4">
                        {basicInfoTabExternalAPIErrorMessage || 'Cannot retrieve data from ClinVar, RefSeq, or Ensembl.'}
                    </Alert>
                ) : (
                    <Alert type="warning" className="mb-4">
                        Clinvar, RefSeq and Ensembl Transcript and submission data not available
                    </Alert>
                )
            }

            <CardPanel title="Variant Genomic Context">
                <VariantGenomicContext
                    GRCh37={GRCh37}
                    GRCh38={GRCh38}
                />
            </CardPanel>

            {renderDataCredit('vep', 'basic-info')}
        </div>
    );
};

BasicInfoTabView.propTypes = {
    basicInfoTabExternalAPILoadingStatus: PropTypes.oneOf(LoadingStatusValues),
    basicInfoTabInternalAPILoadingStatus: PropTypes.bool,
    basicInfoTabExternalAPIErrorMessage: PropTypes.string,
    clinvarVariantId: PropTypes.string,
    GRCh37: PropTypes.string,
    GRCh38: PropTypes.string,
    externalAPIData: PropTypes.object,
    internalAPIData: PropTypes.array
}
