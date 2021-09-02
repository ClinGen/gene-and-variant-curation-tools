// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';

import { molecularConsequencesIds } from '../../../constants/molecular-consequences';
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

const igOrInput = (selected, title, children, layout) => ({ // igOrInput shorts for InputGroup of groupType = "one" and display as input
  type: 'InputGroup',
  groupType: 'or',
  display: 'input',
  title,
  layout,
  selected,
  id: genId('ig'),
  children
});

const sg = (id, title, selected, paths = [], pass) => ({ // sg shorts for StringOption
  type: 'StringOption',
  accessorPaths: paths,
  id,
  title,
  value: id,
  selected,
  pass
});

const mcItem = (key) => sg(key, key, false, [], ({ item }) => item.mc.includes(key));

// ==================================================================
// A collection of essentials filter templates
// ==================================================================

const filterTemplates = () => ({

  'tpl-mc': {
    type: InputGroupsFilterModel,    
    title: 'Molecular Consequences',
    inputGroups: [
      igOneOfHidden(true, [
        sg('doesNotExist', 'No Molecular Consequences information', false, [], ({ item }) => item.mc.length === 0),
        sg('exists', 'Any Molecular Consequences information', true, [], ({ item }) => item.mc.length > 0),
        igOrInput(false, 'With information matching any of the following', [
          ..._.map(molecularConsequencesIds, (key) => mcItem(key))
        ], { type: 'grid', columns: 3 })  
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
