// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';

import { nice } from '../../../../helpers/utils';
import { StandardHeader } from './helpers';


// ==================================================================
// A collection of predictors column templates
// ==================================================================

const columnTemplates = ({ defaultYouCan }) => ({
  'tpl-predictor-revel': {
    title: 'REVEL',
    cat: 'Predictors',
    rtMeta: ({ model }) => ({
      Header: StandardHeader(model.title, model.description),
      className: 'fs-9 right-align',
    }),
    cellRenderer: ({ model }) => (props) => nice(_.get(props.original, 'predictions.REVEL')),
  },
});

function registerColumns(registry) {
  const templates = columnTemplates({ defaultYouCan: registry.defaultYouCan });
  _.forEach(templates, (value, key) => {
    registry.templates[key] = value;
  });
}

export { registerColumns };
