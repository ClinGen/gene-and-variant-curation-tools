import React from 'react';
import { cloneDeep, get as lodashGet } from "lodash";

import VARIANT_SCORE_VARIANT_TYPES from '../../score/constants/variantScoreTypes';
import { getModeInheritanceType, getScoreMOIString, getScoreUpperLimit } from '../../score/helpers/getDefaultScore';
import isHomozygousScore from '../../score/helpers/isHomozygousScore';

export const IndividualScoresTable = ({
  gdm,
  variantScores,
  probandIs,
  recessiveZygosity
}) => {
  
  // Check if any variantScore has been added
  if (variantScores && variantScores.length > 0) {
    let moiType = getModeInheritanceType(lodashGet(gdm, "modeInheritance", null));
    // For SemiDom, if probandIs is "Monoallelic heterozygous" or "Hemizygous" then AUTOSOMAL_DOMINANT
    // if "Biallelic homozygous" or "Biallelic compound heterozygous" then AUTOSOMAL_RECESSIVE

    let scoreCount = 0;
    let scores = [];
    let defaultTotal = 0;
    let showAdjustTotal = false;
    let adjustTotal = 0;
    let totalTextAlign = "";
    let totalLimit = 0;

    // Only scored variantScore will be displayed
    // Get the default and adjusted total scores
    variantScores.forEach(function(obj){
      if (obj.scoreStatus === "Score") {
        scores.push(cloneDeep(obj));
        scoreCount++;
        defaultTotal += 'calculatedScore' in obj && !isNaN(parseFloat(obj.calculatedScore)) ? parseFloat(obj.calculatedScore) : 0;
        adjustTotal += 'score' in obj && !isNaN(parseFloat(obj.score)) ? parseFloat(obj.score) : parseFloat(obj.calculatedScore);
        // If one score has adjusted score then show the total Adjusted score.
        if ('score' in obj && obj.score !== null) {
          showAdjustTotal = true;
        }
        // If AR and homozygous or
        // if SD and probandIs = Biallelic homozygous => AR and homozygous or
        // if SD and probandIs = Biallelic compound heterozygous => AR and homozygous is checked
        // then variant is counted/shown twice
        if (isHomozygousScore(moiType, recessiveZygosity, probandIs)) {
          scores.push(cloneDeep(obj));
          scoreCount++;
          defaultTotal += 'calculatedScore' in obj && !isNaN(parseFloat(obj.calculatedScore)) ? parseFloat(obj.calculatedScore) : 0;
          adjustTotal += 'score' in obj && !isNaN(parseFloat(obj.score)) ? parseFloat(obj.score) : parseFloat(obj.calculatedScore);
          if ('score' in obj && obj.score !== null) {
            showAdjustTotal = true;
          }
        }
      }
    });
    totalTextAlign = scoreCount > 1 ? "text-center align-middle" : "";
    // SOP8 - the most has two scores
    // If has more than 1 score, check if save data selected and have score limit
    if (scoreCount > 1 && scores[0].variantType === scores[1].variantType &&
      scores[0].functionalDataSupport === scores[1].functionalDataSupport &&
      scores[0].deNovo === scores[1].deNovo) {
      totalLimit = getScoreUpperLimit(getScoreMOIString(moiType, probandIs), scores[0]);
      defaultTotal = defaultTotal > totalLimit ? totalLimit : defaultTotal;
      adjustTotal = adjustTotal > totalLimit ? totalLimit : adjustTotal;
    }

    return(
      <>
      {scoreCount > 0 ?
        <>
        <table key="variantScoreTable" className="table border bordered">
          <thead key="variantScoresHeader">
            <tr key="headerRow">
              <th key="var_header">Variant</th>
              <th key="varType_header">Variant Type</th>
              <th key="funcData_header">Functional Data</th>
              <th key="deNovo_header">De Novo</th>
              <th key="defScore_header">Default Score</th>
              <th key="defTotal_header">Default Total Score</th>
              <th key="adjScore_header">Adjusted Score <span className="non-bold-font">(optional)</span></th>
              <th key="adjTotal_header">Adjusted Total Score <span className="non-bold-font">(optional)</span></th>
              <th key="exp_header">Explanation<br/><span className="non-bold-font">(Required if entered Adjusted Score)</span></th>
            </tr>
          </thead>
          <tbody key="variantScoresBody">
            {scores && scores.map((score, i) => {
              return (
                <>
                {score.scoreStatus === "Score" ?
                  <tr key={`variantScore_${i}`}>
                    <td key={`title_${i}`}>{lodashGet(score.variantScored, "preferredTitle", null)}</td>
                    <td key={`variantType_${i}`}>
                      {lodashGet(score, "variantType", null) ? VARIANT_SCORE_VARIANT_TYPES[score.variantType] : ""}
                    </td>
                    <td key={`funcData_${i}`}>
                      {lodashGet(score, "functionalDataSupport", null) ? score.functionalDataSupport : ""}
                    </td>
                    <td key={`denovo_${i}`}>
                      {lodashGet(score, "deNovo", null) ? score.deNovo : ""}
                    </td>
                    <td key={`defScore_${i}`} className="text-center">
                      {'calculatedScore' in score ? score.calculatedScore : ""}
                    </td>
                    {i === 0
                      ? <td key={`defTotal_${i}`} rowSpan={scores.length} className={totalTextAlign}>{defaultTotal}</td>
                      : null
                    }
                    <td key={`adjScore_${i}`} className="text-center">
                      {'score' in score ? score.score : ""}
                    </td>
                    {i === 0
                      ? <td key={`adjTotal_${i}`} rowSpan={scores.length} className={totalTextAlign}>
                          {showAdjustTotal ? adjustTotal : ""}
                        </td>
                      : null
                    }
                    <td key={`explanation_${i}`} className="text-pre-wrap">
                      {lodashGet(score, "scoreExplanation", null) ? score.scoreExplanation : ""}
                    </td>
                  </tr>
                : null}
                </>
              );
            })}
          </tbody>
        </table>
        <div className="mt-2 mr-5 d-flex justify-content-end font-weight-bold">
          {`Total Score: ${adjustTotal}`}
        </div>
        </>
      : null}
      </>
    );
  }
};
