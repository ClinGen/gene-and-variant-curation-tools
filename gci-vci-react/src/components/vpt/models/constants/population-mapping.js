// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';

const titlesToIdsMap = {
  'African/African American': 'AFR',
  'Admixed American': 'AMR',
  'Ashkenazi Jewish': 'ASJ',
  'East Asian': 'EAS',
  'Finnish': 'FIN',
  'Non-Finnish European': 'NFE',
  'South Asian': 'SAS',
  'Other': 'OTH',
  'Female': 'FEMALE',
  'Male': 'MALE',
  'Combined': 'COMBINED',
  'combined': 'COMBINED',
};

const idsToTitlesMap = _.invert(titlesToIdsMap);

export {
  titlesToIdsMap,
  idsToTitlesMap,
};
