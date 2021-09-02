import React from 'react';

import { isEmpty, get as lodashGet } from "lodash";
import { EXTERNAL_API_MAP } from '../../../../constants/externalApis';
import { ExternalLink } from "../../../common/ExternalLink";
import { LabelVariantTitle } from './commonFunc';
import { renderCaseInfoType } from '../../score/ScoreViewer';


export const RetiredVariantTable = ({
  variants,
  score
}) => {

  return (
    <table className="table">
      <tbody>
        {variants && variants.map((variant, i) => {
          return (
            <tr key={`oldVar-${i}`}>
              <td key={`oldTitle-${i}`} colSpan="2">
                <span className="control-label">{LabelVariantTitle(variant, true)}</span><br/>{lodashGet(variant, "preferredTitle", null)}
              </td>
              <td key={`oldClinvarid-${i}`}>
                {variant.clinvarVariantId ?
                  <><span className="control-label">ClinVar Variation ID: </span><ExternalLink href={`${EXTERNAL_API_MAP['ClinVarSearch']}${variant.clinvarVariantId}`} title={`ClinVar entry for variant ${variant.clinvarVariantId} in new tab`}>{variant.clinvarVariantId}</ExternalLink></>
                : null }
              </td>
              <td key={`oldCarid-${i}`}>
                {variant.carId ?
                  <><span className="control-label">ClinGen Allele Registry ID: </span><ExternalLink href={`${EXTERNAL_API_MAP['CARallele']}${variant.carId}.html`} title={`ClinGen Allele Registry entry for ${variant.carId} in new tab`}>{variant.carId}</ExternalLink></>
                : null }
              </td>
              <td key={`oldDesc-${i}`}>
                {variant.otherDescription ?
                  <span>Other description: {variant.otherDescription}</span>
                : null }
              </td>
            </tr>
          );
        })}
        {score && !isEmpty(score) && score.scoreStatus !== "none" ?
          <tr key="oldScore">
            <td key="oldScore-status" width="150px">
              <span className="control-label">Score Status:</span><br/>{score.scoreStatus}
            </td>
            <td key="oldScore-caseInfoType">
              <span className="control-label">Case Information Type:</span><br/>{score.caseInfoType ? renderCaseInfoType(score.caseInfoType) : ""}
            </td>
            <td key="oldScore-inTrans">
              <span className="control-label">If there are 2 variants described, are they both located in trans with respect to one another?:</span><br/>{score.bothVariantsInTrans ? score.bothVariantsInTrans : "No Selection"}
            </td>
            <td key="oldScore-denovo">
              <span className="control-label">If the individual has one variant, is it de novo OR If the individual has 2 variants, is at least one de novo?:</span><br/>{score.denovo ? score.denovo : "No Selection"}
            </td>
            <td key="oldScore-mpConfirmed">
              <span className="control-label">If the answer to the above de novo question is yes, is the variant maternity and paternity confirmed?:</span><br/>{score.maternityPaternityConfirmed ? score.maternityPaternityConfirmed : "No Selection"}
            </td>
            {score.calculatedScore ?
              <td key="oldScore-defaultscore">
                <span className="control-label">Default Score: </span>{score.calculatedScore}
              </td>
            : null}
            {score.score > 0 ?
              <td key="oldScore-changedscore">
                <span className="control-label">Changed Score: </span>{score.score}
              </td>
            : null}
            {score.scoreExplanation ?
              <td key="oldScore-exp">
                <span className="control-label">Reason for score change: </span><br/>{score.scoreExplanation}
              </td>
            : null}
          </tr>
        : null}
      </tbody>
    </table>
  );
};
