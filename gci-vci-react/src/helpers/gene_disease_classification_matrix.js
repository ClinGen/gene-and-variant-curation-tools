import React, { Component } from 'react';
import PropTypes from 'prop-types';

class GeneDiseaseClassificationMatrix extends Component {
  constructor(props) {
    super(props);
  }

  /**
   * Simple Math.round method
   * alternative #1 - Math.round(num * 10) / 10; //*** returns 1 decimal
   * alternative #2 - Math.round((num + 0.00001) * 100) / 100; //*** returns 2 decimals
   */
  classificationMathRound(number, decimals) {
    return Number(Math.round(number + ('e' + decimals)) + ('e-' + decimals));
  }

  render() {
    const classificationPoints = this.props.classificationPoints;

    return (
      <div className="summary-matrix-wrapper">
        <table className="summary-matrix">
          <tbody>
            <tr className="header large bg-gray separator-below">
              <td colSpan="6">Evidence Type</td>
              <td>Variant Count</td>
              <td>Proband Count</td>
              <td>Total Points</td>
              <td>Points Counted</td>
            </tr>
            <tr>
              <td rowSpan="10" className="header"><div className="rotate-text"><div>Genetic Evidence</div></div></td>
              <td rowSpan="8" className="header"><div className="rotate-text"><div>Case-Level</div></div></td>
              <td rowSpan="4" className="header"><div className="rotate-text"><div>Variant</div></div></td>
              <td rowSpan="2" className="header">Autosomal Dominant OR X-linked Disorder</td>
              <td colSpan="2">Predicted or proven null variant</td>
              <td>{classificationPoints['autosomalDominantOrXlinkedDisorder']['probandWithPredictedOrProvenNull']['evidenceCount']}</td>
              <td>{classificationPoints['autosomalDominantOrXlinkedDisorder']['probandWithPredictedOrProvenNull']['probandCount']}</td>
              <td>{classificationPoints['autosomalDominantOrXlinkedDisorder']['probandWithPredictedOrProvenNull']['totalPointsGiven']}</td>
              <td rowSpan="2">{classificationPoints['autosomalDominantOrXlinkedDisorder']['pointsCounted']}</td>
            </tr>
            <tr>
              <td colSpan="2">Other variant type</td>
              <td>{classificationPoints['autosomalDominantOrXlinkedDisorder']['probandWithOtherVariantType']['evidenceCount']}</td>
              <td>{classificationPoints['autosomalDominantOrXlinkedDisorder']['probandWithOtherVariantType']['probandCount']}</td>
              <td>{classificationPoints['autosomalDominantOrXlinkedDisorder']['probandWithOtherVariantType']['totalPointsGiven']}</td>
            </tr>
            <tr>
              <td rowSpan="2" className="header">Autosomal Recessive Disorder</td>
              <td colSpan="2">Predicted or proven null variant</td>
              <td>{classificationPoints['autosomalRecessiveDisorder']['probandWithPredictedOrProvenNull']['evidenceCount']}</td>
              <td rowSpan="2">{classificationPoints['autosomalRecessiveDisorder']['probandCount']}</td>
              <td rowSpan="2">{classificationPoints['autosomalRecessiveDisorder']['pointsGiven']}</td>
              <td rowSpan="2">{classificationPoints['autosomalRecessiveDisorder']['pointsCounted']}</td>
            </tr>
            <tr>
              <td colSpan="2">Other variant type</td>
              <td>{classificationPoints['autosomalRecessiveDisorder']['probandWithOtherVariantType']['evidenceCount']}</td>
            </tr>
            <tr>
              <td colSpan="2" rowSpan="4" className="header">Segregation</td>
              <td className="bg-gray"><span></span></td>
              <td className="header">Summed LOD</td>
              <td colSpan="2" className="header">Family Count</td>
              <td rowSpan="4">{classificationPoints['segregation']['pointsCounted']}</td>
              <td rowSpan="4">{classificationPoints['segregation']['pointsCounted']}</td>
            </tr>
            <tr>
              <td>Candidate gene sequencing</td>
              <td><span>{this.classificationMathRound(classificationPoints['segregation']['evidencePointsCandidate'], 2)}</span></td>
              <td colSpan="2">{classificationPoints['segregation']['evidenceCountCandidate']}</td>
            </tr>
            <tr>
              <td>Exome/genome or all genes sequenced in linkage region</td>
              <td><span>{this.classificationMathRound(classificationPoints['segregation']['evidencePointsExome'], 2)}</span></td>
              <td colSpan="2">{classificationPoints['segregation']['evidenceCountExome']}</td>
            </tr>
            <tr>
              <td className="header">Total Summed LOD Score</td>
              <td className="header">{this.classificationMathRound(classificationPoints['segregation']['totalPointsGiven'], 2)}</td>
              <td colSpan="2" className="bg-gray"><span></span></td>
            </tr>
            <tr>
              <td colSpan="5" className="header">Case-Control</td>
              <td colSpan="2">{classificationPoints['caseControl']['evidenceCount']}</td>
              <td>{classificationPoints['caseControl']['totalPointsGiven']}</td>
              <td>{classificationPoints['caseControl']['pointsCounted']}</td>
            </tr>
            <tr className="header separator-below">
              <td colSpan="8">Genetic Evidence Total</td>
              <td>{classificationPoints['geneticEvidenceTotal']}</td>
            </tr>
            <tr>
              <td rowSpan="12" className="header"><div className="rotate-text"><div>Experimental Evidence</div></div></td>
              <td colSpan="3" rowSpan="3" className="header">Functional</td>
              <td colSpan="3">Biochemical Functions</td>
              <td>{classificationPoints['function']['biochemicalFunctions']['evidenceCount']}</td>
              <td>{classificationPoints['function']['biochemicalFunctions']['totalPointsGiven']}</td>
              <td rowSpan="3">{classificationPoints['function']['pointsCounted']}</td>
            </tr>
            <tr>
              <td colSpan="3">Protein Interactions</td>
              <td>{classificationPoints['function']['proteinInteractions']['evidenceCount']}</td>
              <td>{classificationPoints['function']['proteinInteractions']['totalPointsGiven']}</td>
            </tr>
            <tr>
              <td colSpan="3">Expression</td>
              <td>{classificationPoints['function']['expression']['evidenceCount']}</td>
              <td>{classificationPoints['function']['expression']['totalPointsGiven']}</td>
            </tr>
            <tr>
              <td colSpan="3" rowSpan="2" className="header">Functional Alteration</td>
              <td colSpan="3">Patient cells</td>
              <td>{classificationPoints['functionalAlteration']['patientCells']['evidenceCount']}</td>
              <td>{classificationPoints['functionalAlteration']['patientCells']['totalPointsGiven']}</td>
              <td rowSpan="2">{classificationPoints['functionalAlteration']['pointsCounted']}</td>
            </tr>
            <tr>
              <td colSpan="3">Non-patient cells</td>
              <td>{classificationPoints['functionalAlteration']['nonPatientCells']['evidenceCount']}</td>
              <td>{classificationPoints['functionalAlteration']['nonPatientCells']['totalPointsGiven']}</td>
            </tr>
            <tr>
              <td colSpan="3" rowSpan="2" className="header">Models</td>
              <td colSpan="3">Non-human model organism</td>
              <td>{classificationPoints['modelsRescue']['modelsNonHuman']['evidenceCount']}</td>
              <td>{classificationPoints['modelsRescue']['modelsNonHuman']['totalPointsGiven']}</td>
              <td rowSpan="6">{classificationPoints['modelsRescue']['totalPointsGiven']}</td>
            </tr>
            <tr>
              <td colSpan="3">Cell culture model</td>
              <td>{classificationPoints['modelsRescue']['modelsCellCulture']['evidenceCount']}</td>
              <td>{classificationPoints['modelsRescue']['modelsCellCulture']['totalPointsGiven']}</td>
            </tr>
            <tr>
              <td colSpan="3" rowSpan="4" className="header">Rescue</td>
              <td colSpan="3">Rescue in human</td>
              <td>{classificationPoints['modelsRescue']['rescueHuman']['evidenceCount']}</td>
              <td>{classificationPoints['modelsRescue']['rescueHuman']['totalPointsGiven']}</td>
            </tr>
            <tr>
              <td colSpan="3">Rescue in non-human model organism</td>
              <td>{classificationPoints['modelsRescue']['rescueNonHuman']['evidenceCount']}</td>
              <td>{classificationPoints['modelsRescue']['rescueNonHuman']['totalPointsGiven']}</td>
            </tr>
            <tr>
              <td colSpan="3">Rescue in cell culture model</td>
              <td>{classificationPoints['modelsRescue']['rescueCellCulture']['evidenceCount']}</td>
              <td>{classificationPoints['modelsRescue']['rescueCellCulture']['totalPointsGiven']}</td>
            </tr>
            <tr>
              <td colSpan="3">Rescue in patient cells</td>
              <td>{classificationPoints['modelsRescue']['rescuePatientCells']['evidenceCount']}</td>
              <td>{classificationPoints['modelsRescue']['rescuePatientCells']['totalPointsGiven']}</td>
            </tr>
            <tr className="header separator-below">
              <td colSpan="8">Experimental Evidence Total</td>
              <td>{classificationPoints['experimentalEvidenceTotal']}</td>
            </tr>
            <tr className="total-row header">
              <td colSpan="9">Total Points</td>
              <td>{classificationPoints['evidencePointsTotal']}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
}

GeneDiseaseClassificationMatrix.propTypes = {
  classificationPoints: PropTypes.object
};

export default GeneDiseaseClassificationMatrix;
