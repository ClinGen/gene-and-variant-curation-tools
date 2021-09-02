// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import toastr from 'toastr';

function displayError(msg, error, timeOut = '20000') {
  toastr.error(toMessage(msg, error), 'We have a problem!', Object.assign({}, toasterErrorOptions, { timeOut }));
  if (error) console.error(msg, error);
  if (_.isError(msg)) console.error(msg);
}

function displaySuccess(msg, title = 'Submitted!') {
  toastr.success(toMessage(msg), title, toasterSuccessOptions);
}

function toMessage(msg, error) {
  if (_.isError(msg)) {
    return `${msg.message || msg.friendly} <br/>&nbsp;`;
  }

  if (_.isError(error)) {
    return `${msg} - ${error.message} <br/>&nbsp;`;
  }

  if (_.isArray(msg)) {
    const messages = msg;
    const size = _.size(messages);

    if (size === 0) {
      return 'Unknown error <br/>&nbsp;';
    } else if (size === 1) {
      return messages[0] + '<br/>&nbsp;';
    } else {
      let result = [];
      result.push('<br/>');
      result.push('<ul>');
      _.forEach(messages, function(message) {
        result.push(`<li style="margin-left: -20px;">${message}</li>`);
      });
      result.push('</ul><br/>&nbsp;');

      return result.join('');
    }
  }

  if (_.isEmpty(msg)) return 'Unknown error <br/>&nbsp;';

  return `${msg} <br/>&nbsp;`;
}

const toasterErrorOptions = {
  'closeButton': true,
  'debug': false,
  'newestOnTop': true,
  'progressBar': true,
  'positionClass': 'toast-top-right',
  'preventDuplicates': true,
  'timeOut': '20000', //1000000
  'extendedTimeOut': '50000' //1000000
};

const toasterSuccessOptions = {
  'closeButton': true,
  'debug': false,
  'newestOnTop': true,
  'progressBar': true,
  'positionClass': 'toast-top-right',
  'preventDuplicates': true,
  'timeOut': '1000',
  'extendedTimeOut': '10000'
};

export {
  displayError,
  displaySuccess,
};
