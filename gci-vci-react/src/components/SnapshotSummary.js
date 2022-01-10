import React, {useEffect, useState} from 'react';
import moment from 'moment';
import { API } from 'aws-amplify';
import Button from 'react-bootstrap/Button';
import { API_NAME } from '../utils';
import { renderModeInheritanceLink } from '../helpers/render_mode_inheritance';
import { getAffiliationName } from '../helpers/get_affiliation_name';
import {codeStripValues} from '../components/variant-central/mapping/CodeStripValues';

import CardPanel from '../components/common/CardPanel';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { ExternalLink } from "../components/common/ExternalLink";
import { EXTERNAL_API_MAP } from "../constants/externalApis";
import SummaryTable from '../components/variant-central/SummaryTable';
import { getUserName } from '../helpers/getUserName';
import { renderSimpleStatusLabel } from '../helpers/render_simple_status_label';

/**
 * A simple page used to display the summary snapshot 
 */
const defaultEvaluations = {};
codeStripValues.forEach(v => defaultEvaluations[v.code] = {criteria: v.code, value: "Not Evaluated", explanation: "" });

const SnapshotSummary = (props) => {

  const [provisionalVariant, setProvisionalVariant] = useState({});
  const [interpretation, setInterpretation] = useState({});
  const [variant, setVariant] = useState({});
  const [snapshot, setSnapshot] = useState({});
  const [loading, setLoading] = useState(false);
  const [evaluations, setEvaluations] = useState(defaultEvaluations);

  const location = props.location;
  const urlQueryString = new URLSearchParams(location.search);
  const snapshotPK = urlQueryString.get('snapshot');

  useEffect(() => {
    const fetchSnapshotData = async (snapshotPK) => {
      try {
        setLoading(true);
        // Get Snapshot object by PK sent in router params
        const url =`/snapshots/${snapshotPK}/complete`;
        const snapshot = await API.get(API_NAME, url);
        if (snapshot.resource) {
          setSnapshot(snapshot);
          setProvisionalVariant(snapshot.resource);

          const fetchVariant = async (variantPK) => {
            const variant = await API.get(API_NAME, '/variants/' + variantPK);
            setVariant(variant);
          };

          if (snapshot.resourceParent && snapshot.resourceParent.interpretation) {
            setInterpretation(snapshot.resourceParent.interpretation);
            // if variant in resourceParent does not contain preferredTitle, fetch from database
            if (snapshot.resourceParent.interpretation.variant && snapshot.resourceParent.interpretation.variant.preferredTitle) {
              setVariant(snapshot.resourceParent.interpretation.variant);
            } else {
              fetchVariant(snapshot.resourceParent.interpretation.variant.PK);
            }
          }
          if (snapshot.resourceParent && snapshot.resourceParent.interpretation &&
            snapshot.resourceParent.interpretation.evaluations &&
            snapshot.resourceParent.interpretation.evaluations.length) {
            // Get Evaluations from snapshot
            snapshot.resourceParent.interpretation.evaluations.forEach(evaluation=>{
              const currentEvals = defaultEvaluations;
              currentEvals[evaluation.criteria] = {};
              currentEvals[evaluation.criteria].criteria = evaluation.criteria;
              currentEvals[evaluation.criteria].explanation = evaluation.explanation;
              currentEvals[evaluation.criteria].criteriaStatus = evaluation.criteriaStatus;
              currentEvals[evaluation.criteria].criteriaModifier = evaluation.criteriaModifier;
              setEvaluations(Object.values(currentEvals));
            });
          }
        }
      } catch (err) {
        console.log('error', err)
      }
      setLoading(false);
    };

    if (snapshotPK) {
      fetchSnapshotData(snapshotPK);
    }

  }, [props.match.params.snapshotPK]);
    
  if (!loading) {
    return (
      <div className="container mt-5 mb-5">
        <h2 className="mb-3">Evaluation Summary</h2>
        <CardPanel title={variant && variant.preferredTitle ? variant.preferredTitle : '--'} >
          <div className="row">
            <div className="col-sm-6">
              {variant.clinvarVariantId ?
                <h5><strong>ClinVar VariationID: </strong> 
                  <ExternalLink href={`${EXTERNAL_API_MAP['ClinVarSearch']}${variant.clinvarVariantId}`}>{variant.clinvarVariantId}</ExternalLink>
                </h5>
                : null}
              {variant.carId ?
                <h5><strong>ClinGen Allele Registry ID: </strong> 
                  <ExternalLink href={`${EXTERNAL_API_MAP['CARallele']}${variant.carId}.html`}>{variant.carId}</ExternalLink>
                </h5>
                : null}
              {interpretation && interpretation.affiliation ?
                <h5><strong>Interpretation owner:</strong> {getAffiliationName(interpretation.affiliation)}</h5>
                : (interpretation && interpretation.submitted_by ? getUserName(interpretation.submitted_by) : null)
              }
              <h5><strong>Calculated Pathogenicity:</strong> {provisionalVariant ? provisionalVariant.autoClassification : null}</h5>
              <h5><strong>Modified Pathogenicity:</strong> {provisionalVariant && provisionalVariant.alteredClassification ? (provisionalVariant.alteredClassification === 'No Selection' ? 'None' : provisionalVariant.alteredClassification) : 'None'}</h5>
              <h5><span className="text-pre-wrap"><strong>Reason for modified pathogenicity:</strong> {provisionalVariant && provisionalVariant.reason ? provisionalVariant.reason : 'None'}</span></h5>
            </div>
            <div className="col-sm-6">
              <h5><strong>Interpretation Status:</strong> {provisionalVariant && provisionalVariant.classificationStatus ? (
                // the legacy code `publishStatus` equals to `provisionalVariant.publishClassification || false`, so we pass it down directly here 
                // `renderSimpleStatusLabel` logic is shared between VCI & GCI summary page
                  renderSimpleStatusLabel(provisionalVariant.classificationStatus, provisionalVariant.publishClassification || false)
                ): null}</h5>
              {provisionalVariant && provisionalVariant.last_modified && (
                <>
                  <h5><strong>Date interpretation saved:</strong> {moment(provisionalVariant.last_modified).format("YYYY MMM DD, h:mm a")}</h5>
                </>
              )}
              {provisionalVariant && provisionalVariant.publishClassification && provisionalVariant.publishDate &&(
                <h5><strong>Date interpretation published:</strong> {moment(provisionalVariant.publishDate).format("YYYY MMM DD, h:mm a")}</h5>
              )}
              <h5><strong>Disease:</strong> {snapshot && snapshot.disease && snapshot.diseaseTerm ? <ExternalLink href={`${EXTERNAL_API_MAP["MondoSearch"]}${snapshot.disease.PK}`}>{snapshot.diseaseTerm}</ExternalLink> : 'None'}</h5>
              <h5><strong>Mode of Inheritance:</strong> {snapshot.modeInheritance ? renderModeInheritanceLink(snapshot.modeInheritance, snapshot.modeInheritanceAdjective) : "None"}</h5>
              <h5><strong>Specification Document:</strong> {snapshot && snapshot.cspec && snapshot.cspec.documentName ? snapshot.cspec.documentName : "None"}</h5>
            </div>
          </div>
        </CardPanel>
        <CardPanel title="Evidence Summary">
          <span className="text-pre-wrap">{provisionalVariant && provisionalVariant.evidenceSummary && provisionalVariant.evidenceSummary.length ? provisionalVariant.evidenceSummary : 'No summary is provided.'}</span>
        </CardPanel>

        {evaluations && (
          <SummaryTable evaluations={evaluations} /> 
        )}
        <Button
          variant="primary"
          className="mb-5 float-right"
          onClick={() => window.print()}
        >
          Print PDF
        </Button>
      </div>
    );
  } else {
    return (
      <div className="text-center mt-5 mb-5"><LoadingSpinner /></div>
    );
  }
}



export default SnapshotSummary;
