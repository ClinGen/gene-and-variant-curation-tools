// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

const isLocalDev = process.env.REACT_APP_LOCAL_DEV === 'true';
const awsRegion = process.env.REACT_APP_AWS_REGION_SHORT;
const apiPath = process.env.REACT_APP_API_URL;
const auth0ClientId =  process.env.REACT_APP_AUTH0_VCI_APP_CLIENTID;
const auth0Domain = process.env.REACT_APP_AUTH0_DOMAIN;
const maxVariantsToExport = process.env.REACT_APP_MAX_VARIANTS_TO_EXPORT || 1000;
const maxCaidsToSearch = process.env.REACT_APP_MAX_CAIDS_TO_SEARCH;
const maxHgvsToSearch = process.env.REACT_APP_MAX_HGVS_TO_SEARCH;
const allowSampleData = process.env.REACT_APP_UI_ALLOW_SAMPLE_DATA === 'true';
const vciUrl = process.env.REACT_APP_VCI_API_URL;
// const enableExport = process.env.REACT_APP_ENABLE_EXPORT_SUPPORT === 'true';
const enableExport = true;

export {
  awsRegion,
  apiPath,
  isLocalDev,
  auth0ClientId,
  auth0Domain,
  maxVariantsToExport,
  maxCaidsToSearch,
  maxHgvsToSearch,
  allowSampleData,
  vciUrl,
  enableExport
};
