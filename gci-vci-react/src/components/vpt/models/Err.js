// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import { types } from 'mobx-state-tree';

import { parseError } from '../helpers/utils';

const Err = types.model('Err', {
  message: '',
  code: '',
  requestId: '',
});

const toErr = (error) => {
  const parsed = parseError(error);
  return Err.create({
    message: parsed.message || '',
    code: parsed.code || '',
    requestId: parsed.toErr || '',
  });
};

export { 
  Err,
  toErr,
}
