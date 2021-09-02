// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import React from 'react';
import { Progress } from 'semantic-ui-react';

export default ({ message = 'Loading...' }) => <Progress className="mt2 mb3" percent={100} active color="blue"><span className="color-grey">{message}</span></Progress>;