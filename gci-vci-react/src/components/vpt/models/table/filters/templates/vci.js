// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { store } from '../../../../../../App';

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

const igOneOfLabel = (selected, title, children) => ({ // igOneOfLabel shorts for InputGroup of groupType = "oneOf" and display as label
  type: 'InputGroup',
  groupType: 'oneOf',
  display: 'label',
  title,
  selected,
  id: genId('ig'),
  children
});

const igOrLabel = (selected, title, children) => ({ // igOrLabel shorts for InputGroup of groupType = "or" and display as label
  type: 'InputGroup',
  groupType: 'or',
  display: 'label',
  title,
  selected,
  id: genId('ig'),
  children
});

const igAndInput = (selected, title, children, layout) => ({ // igAndInput shorts for InputGroup of groupType = "and" and display as input
  type: 'InputGroup',
  groupType: 'and',
  display: 'input',
  title,
  selected,
  id: genId('ig'),
  children,
  layout,
});

const sg = (id, title, selected, paths = [], pass, disabled) => ({ // sg shorts for StringOption
  type: 'StringOption',
  accessorPaths: paths,
  id,
  title,
  value: id,
  selected,
  pass,
  disabled,
});

const getMyAffiliation = () => {
  const auth = store.getState().auth;
  return auth.currentAffiliation
};

// ==================================================================
// A collection of vci status filter templates
// ==================================================================

const filterTemplates = () => ({

  'tpl-vci-inter': {
    type: InputGroupsFilterModel,    
    title: 'VCI Interpretation Status',
    cat: 'VCI Interpretations',
    inputGroups: [
      igOneOfHidden(true, [
        sg('doesNotExist', 'No VCI status', false, ['vciStatus']),
        sg('exists', 'Any VCI status', true, ['vciStatus']),
        igAndInput(false, 'With information matching any of the following', [

          igOrLabel(true, 'Status', [
            sg('a', 'Approved', true, ['vciStatus', 'all', 'a'], ({ item }) => _.get(item, ['vciStatus', 'all', 'a']) > 0),
            sg('p', 'Provisional', false, ['vciStatus', 'all', 'p'], ({ item }) => _.get(item, ['vciStatus', 'all', 'p']) > 0),
            sg('i', 'In Progress', false, ['vciStatus', 'all', 'i'], ({ item }) => _.get(item, ['vciStatus', 'all', 'i']) > 0),
          ]),

          igOneOfLabel(true, 'From', [
            sg('exists', 'All', true, ['vciStatus', 'all']),
            {
              type: 'StringOption',
              accessorPaths: [],
              id: 'my',
              title: ({ globals }) => {
                const affiliation = getMyAffiliation();
                if (!affiliation) return 'My Affiliation';
                return `My Affiliation (${affiliation.affiliation_fullname})`;                
              },
              value: 'my',
              selected: false,
              pass: ({ item, globals }) =>  {
                const affiliation = getMyAffiliation();
                if (!affiliation) return false;
                return  (item.vciStatus && !!item.vciStatus[affiliation.affiliation_id]);
              },
              disabled: ({ globals }) => {
                const affiliation = getMyAffiliation();
                if (!affiliation) return true; // disabled
                return false; // enabled
              },
            },
            sg('all-affiliation', 'All Affiliation', false, [], ({ item }) => {
              return _.get(item, ['vciStatus', 'a']) !== undefined && _.get(item, ['vciStatus', 'd']) === undefined;
            }),
            sg('all-individual', 'All Individuals', false, [], ({ item }) => {
              return _.get(item, ['vciStatus', 'd']) !== undefined && _.get(item, ['vciStatus', 'a']) === undefined;
            }),
          ]),

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
