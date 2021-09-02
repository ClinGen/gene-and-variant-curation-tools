// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';

const codes = ['apiError', 'notFound', 'badRequest', 'tokenExpired', 'incorrectImplementation', 'timeout'];

const boom = {
  error: (friendlyOrErr, code, friendly = '') => {
    if (_.isString(friendlyOrErr)) {
      const e = new Error(friendlyOrErr);
      e.isBoom = true;
      e.code = code;
      e.friendly = friendlyOrErr; // the friendly argument is ignore and friendlyOrErr is used instead
      return e;
    } else if (_.isError(friendlyOrErr)) {
      friendlyOrErr.code = code; // eslint-disable-line no-param-reassign
      friendlyOrErr.isBoom = true; // eslint-disable-line no-param-reassign
      friendlyOrErr.friendly = friendly || _.startCase(code);
      return friendlyOrErr;
    }

    // if we are here, it means that the msgOrErr is an object
    const err = new Error(JSON.stringify(friendlyOrErr));
    err.isBoom = true;
    err.code = code;
    err.friendly = friendly || _.startCase(code);

    return err;
  }
};

// inject all the codes array elements as properties for the boom
// example 'apiError' injected => produces boom.apiError(errOrFriendlyMsg, friendlyMsg)
// then you can call boom.apiError(err, 'Error fetching user info')
_.forEach(codes, (code) => {
  boom[code] = (errOrFriendlyMsg, friendlyMsg) => boom.error(errOrFriendlyMsg, code, friendlyMsg);
});

const isNotFound = (error) => {
  return _.get(error, 'code') === 'notFound';
}

const isTokenExpired = (error) => {
  return _.get(error, 'code') === 'tokenExpired';
}

const isForbidden = (error) => {
  return _.get(error, 'code') === 'forbidden';
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

export {
  boom,
  isNotFound,
  isTokenExpired,
  isForbidden,
  swallowError
};
