// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import numeral from 'numeral';
import { observable } from 'mobx';

function parseError(err) {
  const message = _.get(err, 'message', 'Something went wrong - in /ui/src/helpers/utils.js');
  const userMessage = _.get(err, 'friendly', 'Problem processing your request, please try again later.');
  const code = _.get(err, 'code');
  const status = _.get(err, 'status');
  const requestId =  _.get(err, 'requestId');
  const error = new Error(message);

  error.code = code;
  error.requestId = requestId;
  error.friendly = userMessage;
  error.root = err;
  error.status = status;

  return error;
}

function swallowError(promise, fn = () => ({})) {
  try {
    return Promise.resolve()
      .then(() => promise)
      .catch((err) => fn(err));
  } catch(err) {
    fn(err);
  }
}

const storage = observable({
  getItem(key) {
    try {
      if (localStorage) return localStorage.getItem(key);
      return window.localStorage.getItem(key);
    } catch (err) {
      console.log(err);
      try {
        if (sessionStorage) return sessionStorage.getItem(key);
        return window.sessionStorage.getItem(key);  
      } catch (error) {
        // if we get here, it means no support for localStorage nor sessionStorage, which is a problem
        console.log(error);
      }
    }  
  },

  setItem(key, value) {
    try {
      if (localStorage) return localStorage.setItem(key, value);
      return window.localStorage.setItem(key, value);
    } catch (err) {
      console.log(err);
      try {
        if (sessionStorage) return sessionStorage.setItem(key, value);
        return window.sessionStorage.setItem(key, value);  
      } catch (error) {
        // if we get here, it means no support for localStorage nor sessionStorage, which is a problem
        console.log(error);
      }
    }  
  },

  removeItem(key) {
    try {
      if (localStorage) return localStorage.removeItem(key);
      return window.localStorage.removeItem(key);
    } catch (err) {
      console.log(err);
      try {
        if (sessionStorage) return sessionStorage.removeItem(key);
        return window.sessionStorage.removeItem(key);
      } catch (error) {
        // if we get here, it means no support for localStorage nor sessionStorage, which is a problem
        console.log(error);
      }
    }  
  }
});

// a promise friendly delay function
function delay(seconds) {
  return new Promise((resolve) => {
    _.delay(resolve, seconds * 1000);
  });
}

function niceNumber(value) {
  if (_.isNil(value)) return 'N/A';
  if (_.isString(value) && _.isEmpty(value)) return 'N/A';
  return numeral(value).format('0,0');
}

function nicePrice(value) {
  if (_.isNil(value)) return 'N/A';
  if (_.isString(value) && _.isEmpty(value)) return 'N/A';
  return numeral(value).format('0,0.00');
}

function getQueryParam(location, key) {
  const queryParams = (new URL(location)).searchParams;
  return queryParams.get(key);
  // const parsed = queryString.parse(document.location.search);
  // return parsed[key];
}

function removeQueryParams(location, keys) {
  const queryParams = (new URL(location)).searchParams;

  _.forEach(keys, (key) => {
    queryParams.delete(key);
  });

  let newUrl = location.origin + location.pathname;

  if (queryParams.toString()) {
      newUrl += '?' + queryParams.toString();
  }

  newUrl += location.hash;
  return newUrl;  
}

function removeNulls(obj = {}) {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === null) delete obj[key];
  });

  return obj;
}

// remove the "end" string from "str" if it exists
function chopRight(str = '', end = '') {
  if (!_.endsWith(str, end)) return str;
  return str.substring(0, str.length - end.length);
}

const isFloat = (n) => {
  return n % 1 !== 0;
}

const nice = (num) => {
  if (!_.isNumber(num)) return '';
  if (isFloat(num)) {
    if (num < 0.001) return num.toExponential();
    return num;
    // return num.toExponential();
  }
  return niceNumber(num);
}

export {
  parseError,
  swallowError,
  storage,
  delay,
  niceNumber,
  getQueryParam,
  removeQueryParams,
  nicePrice,
  nice,
  removeNulls,
  chopRight,
};
