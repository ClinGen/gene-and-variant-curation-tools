// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';

import { nice } from '../../../../helpers/utils';
import { ParentColumnModel } from '../types/ParentColumn';
import ParentChildEditor from '../editors/ParentChildEditor';
import { StandardHeader } from './helpers';

// ==================================================================
// Some helper functions to start with
// ==================================================================
const buildSubColumn = (id, title, labels = [], enabled = false, align = 'right-align') => ({
  id,
  enabled,
  labels,
  title,
  rtMeta: ({ model }) => ({
    Header: StandardHeader(model.title), // TODO - add description here
    className: `fs-9 ${align}`,
  }),
});

const prop = (props, paths) => _.get(props.original, ['frequencies', 'gnomad', ...paths]);

const columnsForPopulation = (populationId) => ([
  { // these are columns templates that are recognized by the ParentColumnModel
    ...buildSubColumn('total-count', 'Count', ['Total', 'Count'], true),      
    headerColorId: 'platinum',
    bodyColorId: 'whiteSmoke',
    cellRenderer: ({ model }) => (props) => nice(prop(props, [populationId, 'count'])),
  }, {
    ...buildSubColumn('total-number', 'Number', ['Total', 'Number'], true),
    headerColorId: 'platinum',
    bodyColorId: 'whiteSmoke',
    cellRenderer: ({ model }) => (props) => nice(prop(props, [populationId, 'number'])),
  }, {
    ...buildSubColumn('total-freq', 'Frequency', ['Total', 'Frequency'], true),
    headerColorId: 'platinum',
    bodyColorId: 'whiteSmoke',
    cellRenderer: ({ model }) => (props) => nice(prop(props, [populationId, 'freq'])),
  }, {
    ...buildSubColumn('total-homozygotes', 'Homozygotes', ['Total', 'Homozygotes'], true),
    headerColorId: 'platinum',
    bodyColorId: 'whiteSmoke',
    cellRenderer: ({ model }) => (props) => nice(prop(props, [populationId, 'homo'])),
  },  
]);

// ==================================================================
// A collection of population column templates
// ==================================================================
const columnTemplates = ({ defaultYouCan }) => {
  const templateForPopulation = ({ title, description, populationId }) => ({
    title,
    description,
    cat: 'Population (gnomAD)',
    youCan: ['Select the sub columns to display', ...defaultYouCan, ],
    headerColorId: 'cadetGrey',
    rtMeta: ({ model, columns }) => ({
      Header: StandardHeader(model.title, model.description),
      className: 'fs-9',
      columns,
    }),
    columns: columnsForPopulation(populationId),
    editor: ({ model }) => <ParentChildEditor model={model}/>,
    type: ParentColumnModel,
  });
  
  return {

    // ----------------------------------------------------------------
    // Overall Population
    // ----------------------------------------------------------------
    'tpl-gnomad-combined': templateForPopulation({
      title: 'Population - Total',
      description: <div>This column displays <b>gnomAD overall population numbers</b> including both genome and exome numbers. You can choose which sub column to display.</div>,
      populationId: 'COMBINED'
    }),

    // ----------------------------------------------------------------
    // Female
    // ----------------------------------------------------------------
    'tpl-gnomad-female': templateForPopulation({
      title: 'Population - Total Female',
      description: <div>This column displays <b>gnomAD overall Female population numbers</b> including both genome and exome numbers. You can choose which sub column to display.</div>,
      populationId: 'FEMALE',
    }),

    // ----------------------------------------------------------------
    // Male
    // ----------------------------------------------------------------
    'tpl-gnomad-male': templateForPopulation({
      title: 'Population - Total Male',
      description: <div>This column displays <b>gnomAD overall Male population numbers</b> including both genome and exome numbers. You can choose which sub column to display.</div>,
      populationId: 'MALE',
    }),

    // ----------------------------------------------------------------
    // African/African American
    // ----------------------------------------------------------------
    'tpl-gnomad-african': templateForPopulation({
      title: 'Population - African/African American',
      description: <div>This column displays <b>gnomAD African/African American population numbers</b> including both genome and exome numbers. You can choose which sub column to display.</div>,
      populationId: 'AFR',
    }),

    // ----------------------------------------------------------------
    // Admixed American
    // ----------------------------------------------------------------
    'tpl-gnomad-amr': templateForPopulation({
      title: 'Population - Admixed American',
      description: <div>This column displays <b>gnomAD Admixed American population numbers</b> including both genome and exome numbers. You can choose which sub column to display.</div>,
      populationId: 'AMR',
    }),

    // ----------------------------------------------------------------
    // Ashkenazi Jewish
    // ----------------------------------------------------------------
    'tpl-gnomad-asj': templateForPopulation({
      title: 'Population - Ashkenazi Jewish',
      description: <div>This column displays <b>gnomAD Ashkenazi Jewish population numbers</b> including both genome and exome numbers. You can choose which sub column to display.</div>,
      populationId: 'ASJ',
    }),

    // ----------------------------------------------------------------
    // East Asian
    // ----------------------------------------------------------------
    'tpl-gnomad-eas': templateForPopulation({
      title: 'Population - East Asian',
      description: <div>This column displays <b>gnomAD East Asian population numbers</b> including both genome and exome numbers. You can choose which sub column to display.</div>,
      populationId: 'EAS',
    }),

    // ----------------------------------------------------------------
    // Finnish
    // ----------------------------------------------------------------
    'tpl-gnomad-fin': templateForPopulation({
      title: 'Population - Finnish',
      description: <div>This column displays <b>gnomAD Finnish population numbers</b> including both genome and exome numbers. You can choose which sub column to display.</div>,
      populationId: 'FIN',
    }),

    // ----------------------------------------------------------------
    // Non-Finnish European
    // ----------------------------------------------------------------
    'tpl-gnomad-nfe': templateForPopulation({
      title: 'Population - Non-Finnish European',
      description: <div>This column displays <b>gnomAD Non-Finnish European population numbers</b> including both genome and exome numbers. You can choose which sub column to display.</div>,
      populationId: 'NFE',
    }),

    // ----------------------------------------------------------------
    // South Asian
    // ----------------------------------------------------------------
    'tpl-gnomad-sas': templateForPopulation({
      title: 'Population - South Asian',
      description: <div>This column displays <b>gnomAD South Asian population numbers</b> including both genome and exome numbers. You can choose which sub column to display.</div>,
      populationId: 'SAS',
    }),

    // ----------------------------------------------------------------
    // Other
    // ----------------------------------------------------------------
    'tpl-gnomad-oth': templateForPopulation({
      title: 'Population - Other',
      description: <div>This column displays <b>gnomAD Other population numbers</b> including both genome and exome numbers. You can choose which sub column to display.</div>,
      populationId: 'OTH',
    }),

    // ----------------------------------------------------------------
    // genome population filters
    // ----------------------------------------------------------------
    'tpl-gnomad-genome-filters': {
      title: 'Population Filters (genome)',
      cat: 'Population (gnomAD)',
      rtMeta: ({ model }) => ({
        Header: StandardHeader(model.title, model.description),
        className: 'fs-9 right-align',
      }),
      cellRenderer: ({ model }) => (props) => _.get(props.original, ['qcFilters', 'gnomad', 'genomes', 'filters'], []).join(', '),
    },

    // ----------------------------------------------------------------
    // exome population filters
    // ----------------------------------------------------------------
    'tpl-gnomad-exome-filters': {
      title: 'Population Filters (exome)',
      cat: 'Population (gnomAD)',
      rtMeta: ({ model }) => ({
        Header: StandardHeader(model.title, model.description),
        className: 'fs-9 right-align',
      }),
      cellRenderer: ({ model }) => (props) => _.get(props.original, ['qcFilters', 'gnomad', 'exomes', 'filters'], []).join(', '),
    },

    // ----------------------------------------------------------------
    // genome population popmax filter
    // ----------------------------------------------------------------
    'tpl-gnomad-genome-popmax-filters': {
      title: 'Population PopMax Filters (genome)',
      cat: 'Population (gnomAD)',
      rtMeta: ({ model }) => ({
        Header: StandardHeader(model.title, model.description),
        className: 'fs-9 right-align',
      }),
      cellRenderer: ({ model }) => (props) => nice(_.get(props.original, ['qcFilters', 'gnomad', 'genomes', 'popmax'])),
    },

    // ----------------------------------------------------------------
    // exome population popmax filter
    // ----------------------------------------------------------------
    'tpl-gnomad-exome-popmax-filters': {
      title: 'Population PopMax Filters (exome)',
      cat: 'Population (gnomAD)',
      rtMeta: ({ model }) => ({
        Header: StandardHeader(model.title, model.description),
        className: 'fs-9 right-align',
      }),
      cellRenderer: ({ model }) => (props) => nice(_.get(props.original, ['qcFilters', 'gnomad', 'exomes', 'popmax'])),
    },

  };
};

function registerColumns(registry) {
  const templates = columnTemplates({ defaultYouCan: registry.defaultYouCan });
  _.forEach(templates, (value, key) => {
    registry.templates[key] = value;
  });
}

export { registerColumns };
