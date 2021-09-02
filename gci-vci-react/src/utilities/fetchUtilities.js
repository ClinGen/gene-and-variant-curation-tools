import { useMemo, useEffect } from "react";
import { RestAPI as API } from "@aws-amplify/api-rest";
import axios from 'axios';
import lodashGet from 'lodash/get';


export const LoadingStatus = {
  INITIAL: null,
  SUCCESS: 'success',
  ERROR: 'error',
  LOADING: 'loading'
}

export const LoadingStatusValues = Object.keys(LoadingStatus).map(key => LoadingStatus[key]);

/**
 * Class utility to cancel request made by Amplify's `API` methods.
 * See Amplify's doc: https://docs.amplify.aws/lib/restapi/cancel/q/platform/js
 * 
 * Usage: 
 * 1. Wrap it around the request promise (only wrap the initial promise, do not include the chained promise e.g. .then(), .catch()) and use it like
 *  const requestRecycler = new AmplifyAPIRequestRecycler();
 *  ...
 *  requestRecycler.capture(API.get(...)).then(...).catch(...)
 *  ...
 *  // in useEffect() return or componentWillUnmount()
 *  requestRecycler.cancelAll()
 * 
 * 2. Always specify the catch block since promise is canceled in form of rejection. To tell a cancel rejection from other rejection caused by error:
 * 
 *  .catch(error => {
 *    if (API.isCancel(error)) {
 *      // do not perform any state update, route change, etc
 *      return
 *    }
 *    // handle error here
 *    console.error(error)
 *  })
 * 
 * 3. Make sure you're using `import { RestAPI as API } from "@aws-amplify/api-rest";` to import API. The 'aws-amplify' package's API
 *  does not come with cancellation feature.
 */
export class AmplifyAPIRequestRecycler {
  reqeusts = []

  capture = (requestPromise) => {
    this.reqeusts.push(requestPromise)
    return requestPromise;
  }

  cancelAll = () => {
    for (const request of this.reqeusts) {
      API.cancel(request, 'Request was canceled')
    }
    this.reqeusts = []
  }

  static defaultCatch = (error) => {
    if (API.isCancel(error)) {
      return;
    }
    console.error(error);
  }
}


/**
 * Class utility to cancel request made by Axios.
 * 
 * Usage:
 * 1. Make sure you pass in { cancelToken: requestRecycler.token } in AxiosRequestConfig when making request, e.g., the 2nd argument of axios.get
 * 2. Handle the catch block of the request: basically when the request is cancelled, refrain from any local state update; 
 *    the static method `defaultCatch` could serve as a template for you to start on.
 */
export class AxiosRequestRecycler {
  constructor() {
    this.axiosCanceller = axios.CancelToken.source();
  }

  get token() {
    return this.axiosCanceller.token;
  }

  cancelAll = () => {
    this.axiosCanceller.cancel('Request cancelled');
  }

  static defaultCatch = (error) => {
    if (axios.isCancel(error)) {
      return;
    }
    console.error(error);
  }
}


/**
 * Custom hook for `AmplifyAPIRequestRecycler` that saves your
 * effort to write your own useEffect() for cleaning up requests.
 */
export const useAmplifyAPIRequestRecycler = () => {
  const requestRecycler = useMemo(() => new AmplifyAPIRequestRecycler(), []);
  useEffect(() => () => requestRecycler.cancelAll(), [requestRecycler]);
  return requestRecycler;
}


/**
 * Custom hook for Axios call and handles request cancellation & cleanup for you.
 * Make sure you follow the Usage for `AxiosRequestRecycler` on how to use the recycler returned.
 */
export const useAxiosRequestRecycler = () => {
  const requestRecycler = useMemo(() => new AxiosRequestRecycler(), []);
  useEffect(() => () => requestRecycler.cancelAll(), [requestRecycler]);
  return requestRecycler;
}


/**
 * Helper function to retrieve the error message from serverless response error
 * @param {string?} contextDescription - A capitalized, camel-case phrase that represents your error. Default is 'FetchError'.
 * @param {Error} error - The error object provided by catch() callback.
 * @param {string?} endpointText - Optional, you can supply e.g. 'GET /annotations/${pk}' to show endpoint and method information in error message.
 * 
 * @returns {string} - The final error message containing the error information.
 */
export const getDetailErrorMessageFromServerless = (contextDescription = 'FetchError', error, endpointText = '') => {
  if (!(error instanceof Error)) {
    throw new Error('GetServerDetailMessageError: Please pass in a error object. You was passing in ' + (typeof error));
  }
  const serverDetailMessage = lodashGet(error, 'response.data.error', 'No error message from server');

  if (endpointText) {
    const statusCode = lodashGet(error, 'response.status', 'unknownStatusCode');
    const statusText = lodashGet(error, 'response.statusText');
    const statusCodeText = statusCode && statusText ? `${statusCode} ${statusText}` : '';
    return `${contextDescription}: ${statusCodeText} at ${endpointText}: ${serverDetailMessage}`;
  }

  return serverDetailMessage ? 
    `${contextDescription}: ${serverDetailMessage}` :
    contextDescription;
}

export const resolveCallbackReturnValue = async (callbackReturnValue) => {
  if (callbackReturnValue && callbackReturnValue.then) {
    return await callbackReturnValue;
  }
  return callbackReturnValue;
}
