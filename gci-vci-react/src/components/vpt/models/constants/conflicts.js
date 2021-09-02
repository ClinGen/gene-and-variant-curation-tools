// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';

const categoryMap = {
  // "0": "No Conflict",
  "1": "No Conflict",
  "2": "Confidence conflict",
  "3": "(Likely) Benign vs. Uncertain", // "Benign / Likely Benign vs. Uncertain significance conflict",
  "4": "Category conflict",
  "5": "Clinically significant conflict"
}

const categoryTitles = {
  "No Conflict": "No Conflict",
  "Confidence conflict": "Confidence conflict",
  "(Likely) Benign vs. Uncertain": "Benign / Likely Benign vs. Uncertain significance conflict",
  "Category conflict": "Category conflict (ACMG term vs. Non-ACMG term. Example: benign vs. affects)",
  "Clinically significant conflict": "Clinically significant conflict"
}

const categoriesReverseMap = _.invert(categoryMap);
const categories = _.uniq(_.values(categoryMap));

// see https://www.ncbi.nlm.nih.gov/clinvar/docs/review_status/
const reviewStatuses = [
  "practice guideline",
  "reviewed by expert panel",
  "criteria provided, multiple submitters, no conflicts",
  "criteria provided, conflicting interpretations",
  "criteria provided, single submitter",
  "no assertion for the individual variant",
  "no assertion criteria provided",
  "no assertion provided"
];

// see https://www.ncbi.nlm.nih.gov/clinvar/docs/clinsig/#clinsig_options_scv
const aggregatedStatuses = [
  "Benign",
  "Likely benign",
  "Uncertain significance",
  "Likely pathogenic",
  "Pathogenic",
  "Conflicting interpretations of pathogenicity",
  "Pathogenic/Likely pathogenic",
  "Benign/Likely benign",
  "drug response",
  "association",
  "risk factor",
  "protective",
  "Affects",
  "conflicting data from submitters",
  "other",
  "not provided",
  "-",
];

export {
  categoryMap,
  reviewStatuses,
  categories,
  categoryTitles,
  categoriesReverseMap,
  aggregatedStatuses,
};
