// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

// const significanceTypes = {
//   "not provided": 0,
//   "likely benign": 10,
//   "benign": 11,
//   "uncertain significance": 30,
//   "likely pathogenic": 100,
//   "pathogenic": 101,
//   // following are Non-ACMG terms
//   "risk factor": 60,
//   "association": 60,
//   "affects": 60,
//   "drug response": 60,
//   "protective": 60,
//   "other": 60
// }

// function getConflictInfo(SCVs = []) {
//   const significanceCount = {};

//   let minSignificance = 1000; // high value so that first SCV parse will replace it
//   let maxSignificance = -1; // low value so that first SCV parse will replace it

//   SCVs.forEach(item => {

//       const significance = (item.significance || '').toLowerCase();
//       const currCount = significanceCount[significance] || 0;
//       let significanceValue = significanceTypes[significance] || 0;

//       if (significanceValue > 0 && minSignificance > significanceValue)
//           minSignificance = significanceValue;

//       if (maxSignificance < significanceValue)
//           maxSignificance = significanceValue;

//       significanceCount[significance] = currCount + 1;
//   });

//   const diff = maxSignificance - minSignificance;

//   let conflictCategory = 1; //no conflict

//   if (diff > 60) conflictCategory = 5;
//   else if (diff > 25) conflictCategory = 4;
//   else if (diff > 10) conflictCategory = 3;
//   else if (diff > 0) conflictCategory = 2;

//   return {
//       counts: significanceCount,
//       cat: conflictCategory.toString(),
//   };
// }

const significanceMap = {
  "notProvided": "not provided",
  "uncertain": "uncertain significance",
  "benign": "benign",
  "likelyBenign": "likely benign",
  "pathogenic": "pathogenic",
  "likelyPathogenic": "likely pathogenic"
};

const getConflictInfo = (clinVarSignificanceCounts = {}) => {
  const categories = {};
  const significanceCounts = {};
  const keys = Object.keys(clinVarSignificanceCounts);
  keys.forEach((key) => {
    const currentCategoryCount = clinVarSignificanceCounts[key];
    if (currentCategoryCount > 0) {
      categories[key] = true;
      significanceCounts[significanceMap[key]] = currentCategoryCount;
    }
  });

  const nonAcmgCategory = Object.keys(categories).indexOf(cat => cat !== 'benign' && cat !== 'likelyBenign' && cat !== 'uncertain' && cat !== 'pathogenic' && cat !== 'likelyPathogenic');

  let conflictCategory = 1;
  if (
    ((categories['benign'] && categories['likelyBenign'] && !categories['uncertain']) ||
    (categories['pathogenic'] && categories['likelyPathogenic']))
  ) {
    conflictCategory = 2;
  } else if (
    ((categories['benign'] || categories['likelyBenign']) && categories['uncertain']) &&
    (!categories['pathogenic'] && !categories['likelyPathogenic'])
  ) {
    conflictCategory = 3;
  } else if (categories['notProvided'] || nonAcmgCategory > -1) {
    conflictCategory = 4;
  } else if (
    ((categories['benign'] && categories['likelyPathogenic']) || (categories['pathogenic'] && categories['likelyBenign']))
  ) {
    conflictCategory = 5;
  }
    

  return {
    counts: significanceCounts,
    cat: conflictCategory.toString(),
  };
};

export { getConflictInfo };