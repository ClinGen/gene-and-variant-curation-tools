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

const igOrInput = (selected, title, children) => ({ // igOrInput shorts for InputGroup of groupType = "one" and display as input
  type: 'InputGroup',
  groupType: 'or',
  display: 'input',
  title,
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

const templateForPopulation = ({ title, populationId }) => ({
  type: InputGroupsFilterModel,
  title: `Population - ${title}`,
  cat: 'Population (gnomAD)',
  inputGroups: [
    igOneOfHidden(true, [
      sg('doesNotExist', `No ${title} population`, false, ['frequencies', 'gnomad', populationId]),
      sg('exists', `Any ${title} population`, true, ['frequencies', 'gnomad', populationId]),
      igOrInput(false, 'With numbers matching any of the following', [
        fi('specific1', 'Allele Count', false, ['frequencies', 'gnomad', populationId, 'count']),
        fi('specific2', 'Allele Number', false, ['frequencies', 'gnomad', populationId, 'number']),
        fi('specific3', 'Allele Frequency', false, ['frequencies', 'gnomad', populationId, 'freq']),
        fi('specific4', 'Number of Homozygotes', false, ['frequencies', 'gnomad', populationId, 'homo']),
      ])
    ]),
  ],
  editor: ({ model }) => <InputGroupsEditor model={model}/>,
});

const filterValueItem = (type, key) => sg(key, key, false, [], ({ item }) => _.get(item, ['qcFilters', 'gnomad', type, 'filters'], []).includes(key));

// ==================================================================
// A collection of populations filter templates
// ==================================================================

const filterTemplates = () => ({

  // ----------------------------------------------------------------
  // Overall Population
  // ----------------------------------------------------------------
  'tpl-gnomad-combined': templateForPopulation({
    title: 'Total',
    populationId: 'COMBINED',
  }),

  // ----------------------------------------------------------------
  // Female
  // ----------------------------------------------------------------
  'tpl-gnomad-female': templateForPopulation({
    title: 'Total Female',
    populationId: 'FEMALE',
  }),

  // ----------------------------------------------------------------
  // Male
  // ----------------------------------------------------------------
  'tpl-gnomad-male': templateForPopulation({
    title: 'Total Male',
    populationId: 'MALE',
  }),

  // ----------------------------------------------------------------
  // African/African American
  // ----------------------------------------------------------------
  'tpl-gnomad-african': templateForPopulation({
    title: 'African/African American',
    populationId: 'AFR',
  }),

  // ----------------------------------------------------------------
  // Admixed American
  // ----------------------------------------------------------------
  'tpl-gnomad-amr': templateForPopulation({
    title: 'Admixed American',
    populationId: 'AMR',
  }),

  // ----------------------------------------------------------------
  // Ashkenazi Jewish
  // ----------------------------------------------------------------
  'tpl-gnomad-asj': templateForPopulation({
    title: 'Ashkenazi Jewish',
    populationId: 'ASJ',
  }),

  // ----------------------------------------------------------------
  // East Asian
  // ----------------------------------------------------------------
  'tpl-gnomad-eas': templateForPopulation({
    title: 'East Asian',
    populationId: 'EAS',
  }),

  // ----------------------------------------------------------------
  // Finnish
  // ----------------------------------------------------------------
  'tpl-gnomad-fin': templateForPopulation({
    title: 'Finnish',
    populationId: 'FIN',
  }),

  // ----------------------------------------------------------------
  // Non-Finnish European
  // ----------------------------------------------------------------
  'tpl-gnomad-nfe': templateForPopulation({
    title: 'Non-Finnish European',
    populationId: 'NFE',
  }),

  // ----------------------------------------------------------------
  // South Asian
  // ----------------------------------------------------------------
  'tpl-gnomad-sas': templateForPopulation({
    title: 'South Asian',
    populationId: 'SAS',
  }),

  // ----------------------------------------------------------------
  // Other
  // ----------------------------------------------------------------
  'tpl-gnomad-oth': templateForPopulation({
    title: 'Other',
    populationId: 'OTH',
  }),

  // ----------------------------------------------------------------
  // genome population filters
  // ----------------------------------------------------------------
  'tpl-gnomad-genome-filters': {
    type: InputGroupsFilterModel,    
    title: 'Population Filters (genome)',
    cat: 'Population (gnomAD)',
    inputGroups: [
      igOneOfHidden(true, [
        sg('doesNotExist', 'No filters information', false, [], ({ item }) => _.get(item, ['qcFilters', 'gnomad', 'genome', 'filters']) === undefined),
        sg('exists', 'Any filter information', true, [], ({ item }) => _.get(item, ['qcFilters', 'gnomad', 'genome', 'filters']) !== undefined),
        igOrInput(false, 'With information matching any of the following', [
          filterValueItem('genomes', 'PASS'),
          filterValueItem('genomes', 'AC0'),
          filterValueItem('genomes', 'RF'),
          filterValueItem('genomes', 'InbreedingCoeff'),
        ])  
      ]),
    ],
    editor: ({ model }) => <InputGroupsEditor model={model}/>,
  },

  // ----------------------------------------------------------------
  // exome population filters
  // ----------------------------------------------------------------
  'tpl-gnomad-exome-filters': {
    type: InputGroupsFilterModel,    
    title: 'Population Filters (exome)',
    cat: 'Population (gnomAD)',
    inputGroups: [
      igOneOfHidden(true, [
        sg('doesNotExist', 'No filters information', false, [], ({ item }) => _.get(item, ['qcFilters', 'gnomad', 'exomes', 'filters']) === undefined),
        sg('exists', 'Any filter information', true, [], ({ item }) => _.get(item, ['qcFilters', 'gnomad', 'exomes', 'filters']) !== undefined),
        igOrInput(false, 'With information matching any of the following', [
          filterValueItem('exomes', 'PASS'),
          filterValueItem('exomes', 'AC0'),
          filterValueItem('exomes', 'RF'),
          filterValueItem('exomes', 'InbreedingCoeff'),
        ])  
      ]),
    ],
    editor: ({ model }) => <InputGroupsEditor model={model}/>,
  },

  // ----------------------------------------------------------------
  // genome population popmax filters
  // ----------------------------------------------------------------
  'tpl-gnomad-genome-popmax-filters': {
    type: InputGroupsFilterModel,    
    title: 'Population PopMax Filters (genome)',
    cat: 'Population (gnomAD)',
    inputGroups: [
      igOneOfHidden(true, [
        sg('doesNotExist', 'No popmax score', false, ['qcFilters', 'gnomad', 'genomes', 'popmax']),
        sg('exists', 'Any popmax score', true, ['qcFilters', 'gnomad', 'genomes', 'popmax']),
        fi('specific', 'PopMax score', false, ['qcFilters', 'gnomad', 'genomes', 'popmax']),
      ]),
    ],
    editor: ({ model }) => <InputGroupsEditor model={model}/>,
  },

  // ----------------------------------------------------------------
  // exome population popmax filters
  // ----------------------------------------------------------------
  'tpl-gnomad-exome-popmax-filters': {
    type: InputGroupsFilterModel,    
    title: 'Population PopMax Filters (exome)',
    cat: 'Population (gnomAD)',
    inputGroups: [
      igOneOfHidden(true, [
        sg('doesNotExist', 'No popmax score', false, ['qcFilters', 'gnomad', 'exomes', 'popmax']),
        sg('exists', 'Any popmax score', true, ['qcFilters', 'gnomad', 'exomes', 'popmax']),
        fi('specific', 'PopMax score', false, ['qcFilters', 'gnomad', 'exomes', 'popmax']),
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
