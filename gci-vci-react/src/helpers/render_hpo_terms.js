import React from 'react';

/**
 * 
 * Dependent on OLS API service to return data
 * If no data found, simply return the HPO IDs themselves
 * 
 * Due to the XHR requests upon receiving the prop, it relies
 * on changing the state to trigger the re-rendering.
 */
const HpoTerms = ({ hpoIds, hpoTerms }) => (
  <ul className="hpo-terms-list">
    {hpoIds && hpoIds.length &&
      hpoIds.map((id, i) => <li key={i} className="hpo-term-item"><span>{hpoTerms[id]}</span></li>)
    }
  </ul>
);

export default HpoTerms;