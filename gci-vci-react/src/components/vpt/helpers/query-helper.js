// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';

import { boom } from './errors';
import { delay } from './utils';
import { postQuery, getQueryStatus, getQueryResultByUrl } from './api';
import { toInternal } from './transformers';

function throwIfQueryError(query = {}) {
  const queryStatus = _.get(query, 'payload.status', 'unknown');
  const errorCode = _.get(query, 'payload.errorCode', 'unknown');
  const message = _.get(query, 'payload.errorMessage', 'Unknown query error');

  if (queryStatus !== 'in_progress' && queryStatus !== 'completed') {
    if (errorCode === ('NotFound' || 'notFound')) throw boom.notFound(message);
    throw boom.error(message, errorCode);
  }
}

class QueryHelper {
  constructor() {
    this.queue = [];
  }

  async waitForQuery({ queryId }) {
    const timeoutInMinutes = 5;
    const maxAttempts = 30 * timeoutInMinutes; // keep attempting every 2 seconds for 5 minutes
    let query;
    let attempts = 0;
    let stop = false;

    do {
      await delay(2); // wait for 2 seconds
      attempts += 1;
      query = await getQueryStatus(queryId);
      const status = _.get(query, 'payload.status', 'unknown');
      stop = status !== 'in_progress';
    } while (attempts <= maxAttempts && !stop);

    if (attempts > maxAttempts) throw boom.timeout(`The server didn't return the result in time (timeout set for ${timeoutInMinutes} minutes)`);
    return query;
  }

  // returns the following shape
  // {
  //   messages: [ 'INFO|||| ...', 'WARN|||| ...', 'ERROR|||| ...' ],
  //   data: [ { 'caid': 'CA11111', ... }, .. ] see ./helpers/transformers.js for examples
  // }
  async getGeneVariants({ geneName }) {
    let query = await postQuery({ type: 'variantsByGene', geneName });
    throwIfQueryError(query);
    query = await this.waitForQuery({ queryId: query.id });
    throwIfQueryError(query);
    const url = await _.get(query, 'payload.result.url');
    let result = await getQueryResultByUrl(url);

    // we then transform it, see ./helpers/transformers.js for examples
    result = toInternal(result, geneName);
    return result;
  }

  // returns the following shape
  // {
  //   messages: [ 'INFO|||| ...', 'WARN|||| ...', 'ERROR|||| ...' ],
  //   rows: [ { 'caid': 'CA11111', 'gene: '<name>', status: 'found'/'notFound'/'notSearched'/'error', message: '..', result: '..' }, .. ]
  // }
  // Note: unlike getGeneVariants(), we don't call toInternal() at this stage, this is because we need to further process in the result.
  // Later, we use toInternal() to transform it, see ./models/search/CaSearch.js

  async getVariantsByCaids({ caids = [] }) {
    let query = await postQuery({ type: 'caids', caids });
    throwIfQueryError(query);
    query = await this.waitForQuery({ queryId: query.id });
    throwIfQueryError(query);
    const url = await _.get(query, 'payload.result.url');
    const result = await getQueryResultByUrl(url);

    return result;
  }
}

export { QueryHelper };
