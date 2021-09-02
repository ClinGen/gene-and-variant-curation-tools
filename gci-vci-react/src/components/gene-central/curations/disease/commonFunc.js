import React from 'react';

export const renderDiseaseData = (disease) => {
  if (disease && disease.term && disease.term.length) {
    const diseaseName = disease && disease.term && !disease.freetext
      ? (disease.term + (disease.PK ? ` (${disease.PK})` : ''))
      : (disease.term ? disease.term : '');
    return (
      <span>
        <span className="data-view disease-name">{diseaseName}</span>
        {disease.description && disease.description.length ? <span className="data-view disease-desc"><strong>Definition: </strong>{disease.description}</span> : null}
        {disease.phenotypes && disease.phenotypes.length ? <span className="data-view disease-phenotypes"><strong>HPO terms: </strong>{disease.phenotypes.join(', ')}</span> : null}
      </span>
    );
  }
};
