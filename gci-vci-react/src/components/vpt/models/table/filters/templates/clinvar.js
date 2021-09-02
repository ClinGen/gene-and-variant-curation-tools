// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';

import { reviewStatuses, categories, categoryTitles, categoriesReverseMap, aggregatedStatuses } from '../../../constants/conflicts';
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

const rvItem = (key) => sg(key, key, false, [], ({ item }) => item.clinvar && item.clinvar.rv === key);
const aggregatedItem = (key) => {
  const lower = key.toLowerCase(); 
  return sg(lower, key, false, [], ({ item }) => item.clinvar && item.clinvar.csArr && item.clinvar.csArr.includes(lower))
};
const catItem = (key, selected = false) => sg(key, categoryTitles[key] || key, selected, [], ({ item }) => item.clinvar && item.clinvar.conflict && item.clinvar.conflict.cat === categoriesReverseMap[key]);

// ==================================================================
// A collection of clinvar filter templates
// ==================================================================

const filterTemplates = () => ({

  'tpl-clinvar-rv': {
    type: InputGroupsFilterModel,    
    title: 'ClinVar Review Status',
    inputGroups: [
      igOneOfHidden(true, [
        sg('doesNotExist', 'No ClinVar Review Status information', false, [], ({ item }) => !item.clinvar || _.isEmpty(item.clinvar.rv) ),
        sg('exists', 'Any ClinVar Review Status information', true, [], ({ item }) => item.clinvar && item.clinvar.rv),
        igOrInput(false, 'With information matching any of the following', [
          ..._.map(reviewStatuses, (key) => rvItem(key))
        ], { type: 'grid', columns: 2 })  
      ]),
    ],
    editor: ({ model }) => <InputGroupsEditor model={model}/>,
  },

  'tpl-clinvar-aggr': {
    type: InputGroupsFilterModel,    
    title: 'ClinVar Aggregated Clinical Significance',
    inputGroups: [
      igOneOfHidden(true, [
        sg('doesNotExist', 'No ClinVar Aggregated Clinical Significance information', false, [], ({ item }) => !item.clinvar || _.isEmpty(item.clinvar.csArr) ),
        sg('exists', 'Any ClinVar Aggregated Clinical Significance information', true, [], ({ item }) => item.clinvar && item.clinvar.csArr && item.clinvar.csArr.length > 0),
        igOrInput(false, 'With information matching any of the following', [
          ..._.map(aggregatedStatuses, (key) => aggregatedItem(key))
        ], { type: 'grid', columns: 2 })
      ]),
    ],
    editor: ({ model }) => <InputGroupsEditor model={model}/>,
  },

  'tpl-clinvar-conf': {
    type: InputGroupsFilterModel,    
    title: 'ClinVar Significance Conflicts',
    inputGroups: [
      igOneOfHidden(true, [
        sg('doesNotExist', 'No clinVar SCVs information', false, [], ({ item }) => !item.clinvar || !item.clinvar.conflict),
        // sg('exists', 'Any ClinVar Significance Conflicts information', true, [], ({ item }) => item.clinvar && item.clinvar.conflict),
        igOrInput(true, 'With information matching any of the following', [
          catItem('No Conflict', true),
          ..._.map(_.tail(categories), (key) => catItem(key))
        ], { type: 'grid', columns: 2 })  
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
