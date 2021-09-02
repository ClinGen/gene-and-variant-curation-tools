// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';

// this file contains a few utility functions to help with reporting the status of a task within a workflow instance

// just a quick function to help with formatting the info message of a task status
const toInfo = msg => `INFO||||${msg}`;

// just a quick function to help with formatting the warn message of a task status
const toWarn = msg => `WARN||||${msg}`;

// just a quick function to help with formatting the error message of a task status
const toError = msg => `ERROR||||${msg}`;

const getError = (messages = []) => {
  const errMsg = _.filter(messages, msg => _.startsWith(msg, 'ERROR||||'));
  if (!errMsg) return;
  return errMsg.slice('ERROR||||'.length);
};

export {
  toInfo,
  toWarn,
  toError,
  getError,
};
