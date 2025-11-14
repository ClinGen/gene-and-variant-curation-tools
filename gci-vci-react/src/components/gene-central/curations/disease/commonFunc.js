import React from 'react';
import { renderObsoleteDiseaseIcon, displayObsoleteDiseaseIcon } from '../../../../utilities/diseaseUtilities';

export const renderDiseaseData = (disease) => {
  if (disease && disease.term && disease.term.length) {
    const diseaseName = disease && disease.term && !disease.freetext
      ? (disease.term + (disease.PK ? ` (${disease.PK})` : ''))
      : (disease.term ? disease.term : '');
    return (
      <span>
        <span className="data-view disease-name">{displayObsoleteDiseaseIcon(disease.term, "gdm")}{diseaseName}</span>
        {disease.description && disease.description.length ? <span className="data-view disease-desc"><strong>Definition: </strong>{disease.description}</span> : null}
        {disease.phenotypes && disease.phenotypes.length ? <span className="data-view disease-phenotypes"><strong>HPO terms: </strong>{disease.phenotypes.join(', ')}</span> : null}
      </span>
    );
  }
};

export const renderCannotCopyText = () => {
  return (
    <>{renderObsoleteDiseaseIcon("gdm")}Cannot copy obsolete disease</>
  );
};
