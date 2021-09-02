// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import { parseError, delay } from './utils';
import { apiPath } from './settings';

let config = {
  apiPath,
  fetchMode: 'cors',
  maxRetryCount: 4,
};

let token;
let authHeader = (token) => ({ Authorization: `${token}` });

// for now id token is treated like access token
function setIdToken(idToken) {
  token = idToken;
}

function forgetIdToken() {
  token = undefined;
}

function configure(obj) {
  config = Object.assign({}, config, obj);
}

function fetchJson(url, options = {}, retryCount = 0) {
  // see https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
  let isOk = false;
  let httpStatus;

  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  const body = '';
  const merged = Object.assign({}, {
    method: 'GET',
    cache: 'no-cache',
    mode: config.fetchMode,
    redirect: 'follow',
    body,
  }, options, { headers: Object.assign({}, headers, options.headers) });

  if (merged.method === 'GET') delete merged.body; // otherwise fetch will throw an error

  return Promise.resolve()
    .then(() => fetch(url, merged ))
    .catch((err) => { 
      // this will capture network/timeout errors, because fetch does not consider http Status 5xx or 4xx as errors
      if (retryCount < config.maxRetryCount ) {
        let backoff = retryCount * retryCount;
        if (backoff < 1) backoff = 1;

        return Promise.resolve()
          .then(() => console.log('Retrying count = ' + retryCount + ', Backoff = ' + backoff))
          .then(() => delay(backoff))
          .then(() => fetchJson(url, options, retryCount + 1));
      }
      throw parseError(err);
    }) 
    .then((response) => { isOk = response.ok; httpStatus = response.status; return response; })
    .then((response) => response.text())
    .then((text) => {
      let json;
      try {
        json = JSON.parse(text);
      } catch(err) {
        if (httpStatus >= 400) {
          if (httpStatus >= 501 && retryCount < config.maxRetryCount) {
            let backoff = retryCount * retryCount;
            if (backoff < 1) backoff = 1;

            return Promise.resolve()
              .then(() => console.log('Retrying count = ' + retryCount + ', Backoff = ' + backoff))
              .then(() => delay(backoff))
              .then(() => fetchJson(url, options, retryCount + 1));
          }
          throw parseError({ message: text, status: httpStatus });
        } else {
          throw parseError(new Error('The server did not return a json response.'));
        }
      }

      return json;
    })
    .then((json) => {
      if (!isOk) {
        throw parseError(json);
      } else {
        return json;
      }
    });
}

// ---------- helper functions ---------------

// function httpApiGet(urlPath, { params } = {}) {
function httpApiGet(urlPath, { params } = {}) {
  return fetchJson(`${config.apiPath}/${urlPath}`, {
    method: 'GET',
    headers: authHeader(token),
    // params is not used by fetch api
  });
}

// function httpApiPost(urlPath, { data, params } = {}) {
function httpApiPost(urlPath, { data } = {}) {  
  return fetchJson(`${config.apiPath}/${urlPath}`, {
    method: 'POST',
    headers: authHeader(token),
    // params is not used by fetch api
    body: JSON.stringify(data),
  });
}

// function httpApiPut(urlPath, { data, params } = {}) {
function httpApiPut(urlPath, { data } = {}) {
  return fetchJson(`${config.apiPath}/${urlPath}`, {
    method: 'PUT',
    headers: authHeader(token),
    // params is not used by fetch api
    body: JSON.stringify(data),
  });
}

// function httpApiDelete(urlPath, { data, params } = {}) {
//   return fetchJson(`${config.apiPath}/${urlPath}`, {
//     method: 'DELETE',
//     headers: authHeader(token),
//     params,
//     body: JSON.stringify(data),
//   });
// }

// ---------- api calls --------------- 

function authenticate(auth0AccessToken) {
  return fetchJson(`${config.apiPath}/auth`, {
    method: 'POST',
    body: JSON.stringify({
      auth0AccessToken,
    })
  });
}

function getUser() {
  return httpApiGet('user');
}

function getPreferences() {
  return httpApiGet('preferences');
}

function putPreferences(preferences) {
  return httpApiPut('preferences', { data: preferences });
}

async function getVariantsByCaids({ caids = [] }) {
  // this api returns the following shape
  // {
  //   messages: [ 'INFO|||| ...', 'WARN|||| ...', 'ERROR|||| ...' ],
  //   rows: [ { 'caid': 'CA11111', 'gene: '<name>', status: 'found'/'notFound'/'notSearched'/'error', message: '..', result: '..' }, .. ]
  // }
  // Note: unlike getGeneVariants(), we don't call toInternal() at this stage, this is because we need to further process in the result
  // later, we use toInternal() to transform it, see ./models/search/CaSearch.js
  return httpApiPost('search/caids', { data: caids });
}

async function getSearchSession(id) {
  return httpApiGet(`search-sessions/${id}`);
}

async function getSearchSessions() {
  return httpApiGet(`search-sessions`);
}

// query shape = { type: 'variantsByGene' | 'caids, geneName: or caids: [] }
function postQuery(query) {
  return httpApiPost('queries', { data: query });
}

function getQueryStatus(queryId) {
  return httpApiGet(`queries/${queryId}`);
}

async function getQueryResultByUrl(url) {
  return Promise.resolve()
    .then(() => fetch(url, { method: 'GET', cache: 'no-cache', mode: config.fetchMode, redirect: 'follow' }))
    .catch((err) => { 
      // this will capture network/timeout errors, because fetch does not consider http Status 5xx or 4xx as errors
      throw parseError(err);
    })
    .then((response) => { 
      if (!response.ok) {
        throw parseError({ message: response.text(), status: response.status });
      }
      return response;
    })
    .then((response) => response.json());
}

async function getExportOperations(affiliation) {
  if (affiliation) return httpApiGet(`exports?affiliation=${affiliation}`);
  return httpApiGet(`exports`);
}

async function getExportOperation(id) {
  return httpApiGet(`exports/${id}`);
}

async function getExportOperationPayload(id) {
  return httpApiGet(`exports/${id}/payload`);
}

// operation shape is (for normal submit)
// {
// 	"auth0AccessToken": "xxxxxxxxx",
//   "affiliation": "10007", // if applicable
//   "geneName": "xxxxxx"
// 	"data": [{
// 		"caid": "xxxxxxx",
// 		"grch38HGVS": "xxxxxxx",
//     "grch37HGVS": "xxxxxxx",
//     "clinvarVariantId": "xxxxxxx", // if available
//     "clinvarVariantTitle": "xxxxxx", // if available
// 	}]
// }
// operation shape is (for resubmit)
// {
//   "auth0AccessToken": "xxxxxx",
//   "requestId": "xxxxxxx"
// }
async function postExportOperation(operation) {
  return httpApiPost('exports', { data: operation });
}

async function getSaves(affiliation) {
  if (affiliation) return httpApiGet(`saves?affiliation=${affiliation}`);
  return httpApiGet(`saves`);
}

async function postSaves(data) {
  return httpApiPost('saves', { data });
}

async function putSaves(id, data) {
  return httpApiPut(`saves/${id}`, { data });
}

async function getSave(id) {
  return httpApiGet(`saves/${id}`);
}

async function getSavePayload(id) {
  return httpApiGet(`saves/${id}/payload`);
}

export {
  configure,
  setIdToken,
  forgetIdToken,
  authenticate,
  getUser,
  getPreferences,
  putPreferences,
  getSearchSession,
  getSearchSessions,
  getVariantsByCaids,
  getQueryResultByUrl,
  postQuery,
  getQueryStatus,
  getExportOperations,
  getExportOperation,
  getExportOperationPayload,
  postExportOperation,
  getSaves,
  postSaves,
  putSaves,
  getSave,
  getSavePayload,
};
