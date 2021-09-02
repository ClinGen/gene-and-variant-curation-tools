import React, { Component } from 'react';
import PropTypes from 'prop-types';

import CardPanel from '../common/CardPanel';
import { isScoringForCurrentSOP, sopVersionByScoring } from '../../helpers/sop';
import GeneDiseaseClassificationMatrix from '../../helpers/gene_disease_classification_matrix';
import GeneDiseaseClassificationMatrixSOPv7 from '../../helpers/gene_disease_classification_matrix_sop_v7';
import GeneDiseaseClassificationMatrixSOPv5 from '../../helpers/gene_disease_classification_matrix_sop_v5';

class ClassificationMatrix extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const classification = this.props.classification;
    const classificationPoints = classification.classificationPoints;

    return (
      <div className="evidence-summary panel-classification-matrix">
        {this.props.isEvidenceSummary
          ? (
            <CardPanel title="Calculated Classification Matrix">
              {isScoringForCurrentSOP(classificationPoints)
                ? <GeneDiseaseClassificationMatrix classificationPoints={classificationPoints} />
                : (sopVersionByScoring(classificationPoints) === '7'
                  ? <GeneDiseaseClassificationMatrixSOPv7 classificationPoints={classificationPoints} />
                  : <GeneDiseaseClassificationMatrixSOPv5 classificationPoints={classificationPoints} />
                )
              }
            </CardPanel>
          ) : (
            <div className="panel panel-info">
              <div className="panel-heading">
                <h3 className="panel-title">Calculated Classification Matrix</h3>
              </div>
              {isScoringForCurrentSOP(classificationPoints)
                ? <GeneDiseaseClassificationMatrix classificationPoints={classificationPoints} />
                : (sopVersionByScoring(classificationPoints) === '7'
                  ? <GeneDiseaseClassificationMatrixSOPv7 classificationPoints={classificationPoints} />
                  : <GeneDiseaseClassificationMatrixSOPv5 classificationPoints={classificationPoints} />
                )
              }
            </div>
          )
        }
      </div>
    );
  }
}

ClassificationMatrix.propTypes = {
  classification: PropTypes.object
};

export default ClassificationMatrix;
