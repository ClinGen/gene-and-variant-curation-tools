import React from 'react';

const OtherPredictorsInfoTable = () => (
  <table className="table border-top-hidden">
    <thead>
      <tr>
        <th className="predictor-column">Predictor</th>
        <th className="letter-code-column">Letter Code</th>
        <th className="prediction-column">Prediction</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td rowSpan="2" className="predictor-column">SIFT</td>
        <td className="letter-code-column">D</td>
        <td className="prediction-column">Damaging</td>
      </tr>
      <tr>
        <td className="letter-code-column">T</td>
        <td className="prediction-column">Tolerated</td>
      </tr>
      <tr>
        <td rowSpan="3" className="predictor-column">PolyPhen2-HDIV<br/><br/>PolyPhen2-HVAR</td>
        <td className="letter-code-column">D</td>
        <td className="prediction-column">probably Damaging</td>
      </tr>
      <tr>
        <td className="letter-code-column">P</td>
        <td className="prediction-column">Possibly damaging</td>
      </tr>
      <tr>
        <td className="letter-code-column">B</td>
        <td className="prediction-column">Benign</td>
      </tr>
      <tr>
        <td rowSpan="3" className="predictor-column">LRT</td>
        <td className="letter-code-column">D</td>
        <td className="prediction-column">Deleterious</td>
      </tr>
      <tr>
        <td className="letter-code-column">N</td>
        <td className="prediction-column">Neutral</td>
      </tr>
      <tr>
        <td className="letter-code-column">U</td>
        <td className="prediction-column">Unknown</td>
      </tr>
      <tr>
        <td rowSpan="4" className="predictor-column">MutationTaster</td>
        <td className="letter-code-column">A</td>
        <td className="prediction-column">disease causing Automatic</td>
      </tr>
      <tr>
        <td className="letter-code-column">D</td>
        <td className="prediction-column">Disease causing</td>
      </tr>
      <tr>
        <td className="letter-code-column">P</td>
        <td className="prediction-column">Polymorphism automatic</td>
      </tr>
      <tr>
        <td className="letter-code-column">N</td>
        <td className="prediction-column">polymorphism</td>
      </tr>
      <tr>
        <td rowSpan="4" className="predictor-column">MutationAssessor</td>
        <td className="letter-code-column">H</td>
        <td className="prediction-column">High (predicted functional)</td>
      </tr>
      <tr>
        <td className="letter-code-column">M</td>
        <td className="prediction-column">Medium (predicted functional)</td>
      </tr>
      <tr>
        <td className="letter-code-column">L</td>
        <td className="prediction-column">Low (predicted non-functional)</td>
      </tr>
      <tr>
        <td className="letter-code-column">N</td>
        <td className="prediction-column">Neutral</td>
      </tr>
      <tr>
        <td rowSpan="2" className="predictor-column">FATHMM</td>
        <td className="letter-code-column">D</td>
        <td className="prediction-column">Damaging</td>
      </tr>
      <tr>
        <td className="letter-code-column">T</td>
        <td className="prediction-column">Tolerated</td>
      </tr>
      <tr>
        <td rowSpan="2" className="predictor-column">PROVEAN</td>
        <td className="letter-code-column">D</td>
        <td className="prediction-column">Damaging</td>
      </tr>
      <tr>
        <td className="letter-code-column">N</td>
        <td className="prediction-column">Neutral</td>
      </tr>
      <tr>
        <td rowSpan="2" className="predictor-column">METASVM</td>
        <td className="letter-code-column">D</td>
        <td className="prediction-column">Damaging</td>
      </tr>
      <tr>
        <td className="letter-code-column">T</td>
        <td className="prediction-column">Tolerated</td>
      </tr>
      <tr>
        <td rowSpan="2" className="predictor-column">METALR</td>
        <td className="letter-code-column">D</td>
        <td className="prediction-column">Damaging</td>
      </tr>
      <tr>
        <td className="letter-code-column">T</td>
        <td className="prediction-column">Tolerated</td>
      </tr>
    </tbody>
  </table>
);

export default OtherPredictorsInfoTable;