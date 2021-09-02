import React from 'react';

const PointTotals = ({ label, score}) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'flex-end',
      padding: 10,
      borderTop: 0,
      fontSize: '1.2rem'
    }}
  >
    <b className="mr-2">{label}</b>
    <b>{score}</b>
  </div>
)

export default PointTotals;