import React, { Fragment } from "react";
import PropTypes from 'prop-types';
import { OverlayTrigger, Tooltip, Popover } from "react-bootstrap";
import { Link } from "react-router-dom";
import moment from 'moment';

import LoadingSpinner from "../../common/LoadingSpinner";
import { DataTable } from "../../common/DataTable";
import { ExternalLink } from "../../common/ExternalLink";
import { EXTERNAL_API_MAP } from "../../../constants/externalApis";
import { LoadingStatusValues, LoadingStatus } from "../../../utilities/fetchUtilities";
import { convertDiseasePKToMondoId, isFreeTextDisease } from "../../../utilities/diseaseUtilities";
import { OwnerTextDisplay } from "../../../utilities/ownershipUtilities";
import { renderInterpretationStatus } from "../../recordStatus/interpretationStatus";


const headers = [
    "Nucleotide Change",
    "Exon",
    "Protein Change",
    "Molecular Consequence",
];

const CanonicalBadge = () => {
    return (
        <OverlayTrigger
            placement="top"
            overlay={<Tooltip>Canonical transcript</Tooltip>}
        >
            <span className="canonical badge badge-primary">C</span>
        </OverlayTrigger>
    )
};

const MANEBadge = () => {
    return (
        <OverlayTrigger
            placement="top"
            overlay={<Tooltip>MANE selected transcript</Tooltip>}
        >
            <span className="mane badge badge-warning">MANE Select</span>
        </OverlayTrigger>
    )
};

const TranscriptTable = (props) => {
    return (
        <DataTable 
            headers={headers}
            data={props.data}
        >
            {(d) => (
                <>
                    {d.hgvsc}
                    {d.gene_symbol && ` (${d.gene_symbol})`}

                    {d.mane && <MANEBadge />}
                    {d.canonical && <CanonicalBadge />}
                </>
            )}
            {(d) => d.exon}
            {(d) => d.hgvsp}
            {(d) => {
                return Array.isArray(d.consequence_terms) ? d.consequence_terms.join(', ') : d.consequence_terms;
            }}
        </DataTable>
    );
};

export const BasicInfoTranscriptTableView = (props) => {
    return (
        <>
            <div>
                {props.loadingStatus === LoadingStatus.SUCCESS ? (
                    <TranscriptTable data={props.data} />
                ) : props.loadingStatus === LoadingStatus.ERROR ? (
                    <span>Failed to retrieve data</span>
                ) : (
                    <LoadingSpinner />
                )}
            </div>
        </>
    );
};
BasicInfoTranscriptTableView.propTypes = {
    loadingStatus: PropTypes.oneOf(LoadingStatusValues)
}

export const PrimaryTranscriptTableView = (props) => {
    return (
        <>
            {props.basicInfoTabExternalAPILoadingStatus === LoadingStatus.INITIAL || 
                props.basicInfoTabExternalAPILoadingStatus === LoadingStatus.LOADING || 
                (props.basicInfoTabExternalAPILoadingStatus === LoadingStatus.SUCCESS && Array.isArray(props.data) && props.data.length ) ? (
                <BasicInfoTranscriptTableView
                    data={props.data}
                    loadingStatus={props.basicInfoTabExternalAPILoadingStatus}
                />
            ) : 
            props.basicInfoTabExternalAPILoadingStatus === LoadingStatus.ERROR ? (
                <span>Failed to retrieve data</span>
            ) : (
            props.clinvarVariantId ? (
                // success but no data, even if has clinvar id
                <span>Unable to return ClinVar Primary Transcript for ClinVar VariationID <a href={'http://www.ncbi.nlm.nih.gov/clinvar/variation/' + props.clinvarVariantId} target="_blank" rel="noopener noreferrer">{props.clinvarVariantId}</a>.</span>
            ) : (
                // success but no data, given no clinvar id
                <span>No data was found for this allele in ClinVar. <a href="http://www.ncbi.nlm.nih.gov/clinvar/" target="_blank" rel="noopener noreferrer">Search ClinVar</a> for this variant.</span>
            ))}
        </>
    )
}

const clinvarSubmittedInterpretationSCVsTableHeaders = [
    'Clinical significance (Last evaluated)',
    'Review Status (Assertion method)',
    'Condition(s) (Mode of inheritance)',
    'Submitter - Study name',
    'Submission accession'
];

const ClinvarSubmittedInterpretationSCVsTable = ({ data = [] }) => {
    return (
        <DataTable headers={clinvarSubmittedInterpretationSCVsTableHeaders} data={data} rowClassName="clinical-assertion">
            {(d) => (
                <>
                    {d.clinicalSignificance}<br/>{d.dateLastEvaluated ? '(' + d.dateLastEvaluated + ')' : null}
                </>
            )}
            {(d) => (
                <>
                    <div>{d.reviewStatus}</div><div>{handleAssertionMethodLinkOut(d)}</div>
                </>
            )}
            {(d) => (
                <div className="disease">
                    {d.phenotypeList.map((phenotype) => {
                        return (handleCondition(phenotype, d.modeOfInheritance));
                    })}
                </div>
            )}
            {(d) => {
                const href = EXTERNAL_API_MAP['ClinVar'] + 'submitters/' + d.orgID + '/';
                return (
                    <>
                        <Link to={{ pathname: href }} target="_blank">{d.submitterName}</Link>
                        {d.studyDescription ?
                            <div>
                                <OverlayTrigger
                                    trigger="click"
                                    rootClose
                                    overlay={
                                        <Popover>
                                            <Popover.Title>Study description</Popover.Title>
                                            <Popover.Content>
                                                {d.studyDescription}
                                            </Popover.Content>
                                        </Popover>
                                    }
                                >
                                    <Link to="#">Study description</Link>
                                </OverlayTrigger>
                            </div>
                            : null}
                    </>
                )
            }}
            {(d) => (
                <span>{d.accession}.{d.version}</span>
            )}
        </DataTable>
    )
}

export const ClinvarSubmittedInterpretationSCVsTableView = ({
    basicInfoTabExternalAPILoadingStatus,
    data = []
}) => {
    return (
        <>
            {basicInfoTabExternalAPILoadingStatus === LoadingStatus.INITIAL ||
            (basicInfoTabExternalAPILoadingStatus === LoadingStatus.SUCCESS && data.length) ? (
                <ClinvarSubmittedInterpretationSCVsTable data={data} />
            ) : (basicInfoTabExternalAPILoadingStatus === LoadingStatus.SUCCESS && !data.length) ? (
                <span>No data was found for this allele in ClinVar. <a href="http://www.ncbi.nlm.nih.gov/clinvar/" target="_blank" rel="noopener noreferrer">Search ClinVar</a> for this variant.</span>
            ) : (basicInfoTabExternalAPILoadingStatus === LoadingStatus.ERROR) ? (
                <span>Failed to retrieve data</span>
            ) : (
                <LoadingSpinner />
            )}
        </>
    )
}
ClinvarSubmittedInterpretationSCVsTableView.propTypes = {
    basicInfoTabExternalAPILoadingStatus: PropTypes.oneOf(LoadingStatusValues),
    data: PropTypes.array
}

// Method to contruct linkouts for assertion methods
// based on a given url or pubmed id
const handleAssertionMethodLinkOut = (item) => {
    if (item.assertionMethod) {
        if (item.AssertionMethodCitationURL) {
            return (
                <Link to={{ pathname: item.AssertionMethodCitationURL }} target="_blank">{item.assertionMethod}</Link>
            );
        } else if (item.AssertionMethodCitationPubMedID) {
            const href = EXTERNAL_API_MAP['PubMed'] + item.AssertionMethodCitationPubMedID;
            return (
                <Link to={{ pathname: href }} target="_blank">{item.assertionMethod}</Link>
            );
        } else {
            return (
                <span>{item.assertionMethod}</span>
            );
        }
    } else {
        // Certain SCVs don't have assertion methods, such as
        // https://www.ncbi.nlm.nih.gov/clinvar/variation/17000/#clinical-assertions
        return '';
    }
}

// Method to render each associated condition, which also consists of multiple identifiers
const handleCondition = ({identifiers = [], ...condition}, moi) => {
    return (
        <div className="condition" key={condition.name}>
            <div className="condition-name">{condition.name}{moi ? ` (${moi})` : ''}</div>

            {identifiers.length ?
                <div className="identifiers">

                    [
                        {identifiers.map(function(identifier, i) {
                            const url = handleLinkOuts(identifier.id, identifier.db);
                            return (
                                <Fragment key={i}>
                                    {url ?
                                        <Link to={{ pathname: url }} target="_blank">{identifier.db === 'Human Phenotype Ontology' ? 'HPO' : identifier.db}</Link>
                                        :
                                        <span>{identifier.db + ': ' + identifier.id}</span>
                                    }
                                </Fragment>
                            );
                        }).reduce((acc, cur) => [acc, ' | ', cur])}
                    ]
                </div>
                :
                null
            }
        </div>
    );
}

// Method to return linkout url given a db name
const handleLinkOuts = (id, db) => {
    let url;
    switch (db) {
        case "MedGen":
            url = EXTERNAL_API_MAP['MedGen'] + id;
            break;
        case "Orphanet":
            url = EXTERNAL_API_MAP['OrphaNet'] + id;
            break;
        case "OMIM":
            url = EXTERNAL_API_MAP['OMIMEntry'] + id;
            break;
        case "Gene":
            url = EXTERNAL_API_MAP['Entrez'] + id;
            break;
        case "Human Phenotype Ontology":
            url = EXTERNAL_API_MAP['HPO'] + id;
            break;
        case "MeSH":
            url = EXTERNAL_API_MAP['MeSH'] + id + '%5BMeSH%20Unique%20ID%5D';
            break;
        default:
            url = null;
    }
    return url;
}


const ClinvarInterpretationSummaryTable = ({ data }) => {
    const leftHalfSideColumnSpan = '7'
    const leftHeaderColumnSpan = '4'
    const rightHeaderColumnSpan = '7'
    return (
        <div className="clinvar-interpretaions-content-wrapper">
            <div className="panel-body clearfix clinvar-interpretation-summary row">
                <div className={`col-sm-${leftHalfSideColumnSpan}`}>
                    <dl className="row">
                        <dt className={`col-sm-${leftHeaderColumnSpan}`}>Review status:</dt><dd className="col">{data['ReviewStatus']}</dd>
                    </dl>
                    <dl className="row">
                        <dt className={`col-sm-${leftHeaderColumnSpan}`}>Clinical significance:</dt>
                        <dd className="col">
                            {data['ClinicalSignificance']}<br/>{data['Explanation']}
                        </dd>
                    </dl>
                </div>
                <div className="col">
                    <dl className="row">
                        <dt className={`col-sm-${rightHeaderColumnSpan}`}>Last evaluated:</dt><dd className="col">{moment(data['DateLastEvaluated']).format('MMM DD, YYYY')}</dd>
                    </dl>
                    <dl className="row">
                        <dt className={`col-sm-${rightHeaderColumnSpan}`}>Number of submission(s):</dt>
                        <dd className="col">
                            {data['SubmissionCount']}
                        </dd>
                    </dl>
                </div>
            </div>
        </div>
    )
}
ClinvarInterpretationSummaryTable.propTypes = {
    data: PropTypes.object
}

export const ClinvarInterpretationSummaryTableView = ({
    data = {}, 
    loadingStatus
}) => {
    return loadingStatus === LoadingStatus.SUCCESS && Object.keys(data).length > 0 ? (
        <ClinvarInterpretationSummaryTable data={data} />
    ) : loadingStatus === LoadingStatus.SUCCESS ? (
        <div className="panel-body">
            <span>No data was found for this allele in ClinVar. <a href="http://www.ncbi.nlm.nih.gov/clinvar/" target="_blank" rel="noopener noreferrer">Search ClinVar</a> for this variant.</span>
        </div> 
    ) : loadingStatus === LoadingStatus.ERROR ? (
        <span>Failed to retrieve data</span>
    ) : (
        <LoadingSpinner />
    );
}
ClinvarInterpretationSummaryTableView.propTypes = {
    loadingStatus: PropTypes.oneOf(LoadingStatusValues),
    data: PropTypes.object
}


const vciInterpretationTableHeaders = [
    'Classification',
    'Status',
    'Condition - Mode of inheritance',
    'Curator/Affiliation',
]

const VciInterpretationTable = ({ data = [] }) => {
    return (
        <DataTable
            headers={vciInterpretationTableHeaders}
            rowClassName="approved-interpretation"
            data={data}
        >
            {(interpretation) => {
                let showPathogenicity = true;
                if (interpretation && interpretation.provisionalVariant) {
                    // first check classificationStatus
                    if (interpretation.provisionalVariant.classificationStatus) {
                        if (typeof interpretation.provisionalVariant.classificationStatus === 'string' && interpretation.provisionalVariant.classificationStatus.toLowerCase() === 'in progress') {
                            showPathogenicity = false;
                        }
                    // in the case that classificationStatus is missing, check interpretation.status
                    } else {
                        if (interpretation.status && typeof interpretation.status === 'string' && interpretation.status.toLowerCase() === 'in progress') {
                            showPathogenicity = false;
                        }
                    }
                }
              return (
                  <div className="clinical-significance">
                    {showPathogenicity ?
                      <div>
                        {interpretation.provisionalVariant && interpretation.provisionalVariant.autoClassification ?
                        <span><strong>Calculated:</strong> {interpretation.provisionalVariant.autoClassification.split('-')[0]}</span>
                        : '--'}
                        {interpretation.provisionalVariant && interpretation.provisionalVariant.alteredClassification ?
                            <span><br /><strong>Modified:</strong> {interpretation.provisionalVariant.alteredClassification.split('-')[0]}</span>
                            : null}
                      </div>
                      : '--'}
                  </div>
              )
            }}
            {(interpretation) => {
                return (
                    <div className="interpretation-status">
                        {interpretation.snapshots ? renderInterpretationStatus(interpretation.snapshots, interpretation.provisionalVariant, true) : null}
                    </div>
                )
            }}
            {(interpretation) => {
                return (
                    <div className="condition-mode-of-inheritance">
                        {interpretation.disease ?
                            <span>
                                {interpretation.disease.term}
                                <span>&nbsp;</span>
                                {!isFreeTextDisease(interpretation.disease) ? 
                                    // display Mondo disease link
                                    <span>(<Link to={{ pathname: EXTERNAL_API_MAP['MondoSearch'] + interpretation.disease.PK }} target="_blank">{convertDiseasePKToMondoId(interpretation.disease.PK)}</Link>)</span>
                                    :
                                    // display free text disease
                                    <div>
                                        {interpretation.disease.phenotypes && interpretation.disease.phenotypes.length ?
                                            <OverlayTrigger
                                                trigger="click"
                                                rootClose
                                                overlay={
                                                    <Popover className="gdm-disease-phenotypes">
                                                        <Popover.Title>HPO term(s)</Popover.Title>
                                                        <Popover.Content>
                                                            {interpretation.disease.phenotypes.join(', ')}
                                                        </Popover.Content>
                                                    </Popover>
                                                }
                                            >
                                                <Link to="#">View HPO term(s)</Link>
                                            </OverlayTrigger>
                                            : null}
                                    </div>
                                }
                            </span>
                            :
                            <span>Not provided</span>
                        }
                        {interpretation.modeInheritance ?
                            <span><span className="condition-moi-separator">&nbsp;-&nbsp;</span>
                                {interpretation.modeInheritance.indexOf('(HP:') === -1 ?
                                    <i>{interpretation.modeInheritance}</i>
                                    :
                                    <i>{interpretation.modeInheritance.substr(0, interpretation.modeInheritance.indexOf('(HP:')-1)}</i>
                                }
                                {interpretation.modeInheritanceAdjective ?
                                    <span className="condition-moi-separator">&nbsp;-&nbsp;
                                        {interpretation.modeInheritanceAdjective.indexOf('(HP:') === -1 ?
                                            <i>{interpretation.modeInheritanceAdjective}</i>
                                            :
                                            <i>{interpretation.modeInheritanceAdjective.substr(0, interpretation.modeInheritanceAdjective.indexOf('(HP:')-1)}</i>
                                        }
                                    </span> 
                                    : null}
                            </span>
                            : null}
                    </div>
                )
            }}
            {(interpretation) => {
                return (
                    <div className="submitter">
                        <OwnerTextDisplay object={interpretation} />
                    </div>
                )
            }}
        </DataTable>
    )
}
VciInterpretationTable.propTypes = {
    data: PropTypes.array
}


export const VciInterpretationTableView = ({ loadingStatus, data = [] }) => {
    return !loadingStatus && data.length ? (
        <VciInterpretationTable data={data} />
    ) : (!loadingStatus) ? (
        <span>This variant has no existing interpretations.</span>
    ) : (
        <LoadingSpinner />
    );
}
VciInterpretationTableView.propTypes = {
    loadingStatus: PropTypes.bool,
    data: PropTypes.array
}


export const VariantGenomicContext = ({ GRCh37, GRCh38 }) => {
    return (
        <p className="card-text">
            GRCh37: <strong>{GRCh37 || "--"}</strong>, GRCh38: <strong>{GRCh38 || "--"}</strong>
        </p>
    )
}
VariantGenomicContext.propTypes = {
    GRCh37: PropTypes.string,
    GRCh38: PropTypes.string
}

export const CivicLink = ({ civicData, loadingCivic }) => {
  let url;
  const geneId = civicData.gene_id ? civicData.gene_id : null;
  const variantId = civicData.id ? civicData.id : null;
  const evidenceCount = civicData.evidence_items ? civicData.evidence_items.length : [];

  if (geneId && variantId) {
    url = `https://civicdb.org/events/genes/${geneId}/summary/variants/${variantId}/summary#variant`
  }
  return (
    !loadingCivic && Object.keys(civicData).length > 0 ? (
      <ExternalLink href={url}>CIViC evidence for variant ({evidenceCount} EIDs found)</ExternalLink>
    ) : !loadingCivic && Object.keys(civicData).length === 0 ? (
      'Link is not available for this variant at this genomic location.'
    ) : (
      <LoadingSpinner/>
    )
  );
};

export const BasicInfoLovdTableView = ({
    lovdLink,
    loadingLovd,
}) => (
    !loadingLovd && lovdLink ? (
        <p className="card-text">
            {lovdLink.shared && <ExternalLink href={lovdLink.shared}>Global Variome shared LOVD</ExternalLink>}
            {lovdLink.whole_genome && <ExternalLink href={lovdLink.whole_genome}>LOVD Whole genome datasets</ExternalLink>}
        </p>
    ) : !loadingLovd && !lovdLink ? (
        <div className="panel-body">
            <span>Link to LOVD is not available for this variant at this genomic location.</span>
        </div> 
    ) : (
        <LoadingSpinner />
    )
);
