// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';

import { InputGroupsFilterModel } from '../types/InputGroupsFilter';
import InputGroupsEditor from '../editors/InputGroupsEditor';

// ==================================================================
// Some helper functions to start with
// ==================================================================
let counter = 0;
const genId = (prefix) => {
  counter += 1;
  return `${prefix}-${counter}`;
};

const igOneOfHidden = (selected, children) => ({ // igOneOfHidden shorts for InputGroup of groupType = "oneOf"
  type: 'InputGroup',
  groupType: 'oneOf',
  display: 'hidden',
  selected,
  id: genId('ig'),
  children
});

// const igOrInput = (selected, title, children) => ({ // igOrInput shorts for InputGroup of groupType = "one" and display as input
//   type: 'InputGroup',
//   groupType: 'or',
//   display: 'input',
//   title,
//   selected,
//   id: genId('ig'),
//   children
// });

const sg = (id, title, selected, paths = [], pass) => ({ // sg shorts for StringOption
  type: 'StringOption',
  accessorPaths: paths,
  id,
  title,
  value: id,
  selected,
  pass,
});

const fi = (id, title, selected, path = []) => ({ // fi shorts for FloatInput
  type: 'FloatInput',
  accessorPaths: path,
  id,
  title,
  value: id,
  selected,
});

// ==================================================================
// A collection of predictors filter templates
// ==================================================================

const filterTemplates = () => ({


  'tpl-predictor-revel': {
    type: InputGroupsFilterModel,    
    title: 'REVEL',
    cat: 'Predictors',
    inputGroups: [
      igOneOfHidden(true, [
        sg('doesNotExist', 'No REVEL score', false, ['predictions', 'REVEL']),
        sg('exists', 'Any REVEL score', true, ['predictions', 'REVEL']),
        fi('specific', 'REVEL score', false, ['predictions', 'REVEL']),
      ]),
    ],
    editor: ({ model }) => <InputGroupsEditor model={model}/>,
  },


});

function registerFilters(registry) {
  const templates = filterTemplates();
  _.forEach(templates, (value, key) => {
    registry.templates[key] = value;
  });
}

export { registerFilters };
