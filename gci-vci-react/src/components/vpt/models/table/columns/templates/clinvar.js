// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';

import { StandardHeader, Multiline } from './helpers';
import { categoryMap } from '../../../constants/conflicts';

// ==================================================================
// A collection of clinvar column templates
// ==================================================================

const columnTemplates = ({ defaultYouCan }) => ({
  'tpl-clinvar-title': {
    title: 'ClinVar Title',
    rtMeta: ({ model }) => ({
      Header: StandardHeader(model.title, model.description),
      className: 'fs-9',
    }),
    cellRenderer: ({ model }) => (props) => { const v = _.get(props.original, 'clinvar.title');  return <span title={v}>{v}</span>; },
  },
  'tpl-clinvar-rv': {
    title: 'ClinVar Review Status',
    rtMeta: ({ model }) => ({
      Header: StandardHeader(model.title, model.description),
      className: 'fs-9',
    }),
    cellRenderer: ({ model }) => (props) => { const v = _.get(props.original, 'clinvar.rv');  return <span title={v}>{v}</span>; },
  },
  'tpl-clinvar-cs': {
    title: 'ClinVar Aggregated Clinical Significance',
    rtMeta: ({ model }) => ({
      Header: StandardHeader(model.title, model.description),
      className: 'fs-9',
    }),
    cellRenderer: ({ model }) => (props) => { const v = _.get(props.original, 'clinvar.cs');  return <span title={v}>{v}</span>; },
  },
  'tpl-clinvar-id': {
    title: 'ClinVar ID',
    rtMeta: ({ model }) => ({
      Header: StandardHeader(model.title, model.description),
      className: 'fs-9',
    }),
    cellRenderer: ({ model }) => (props) => { const v = _.get(props.original, 'clinvar.id'); return <span title={v}>{v}</span> }
  },
  'tpl-clinvar-conflict': {
    title: 'ClinVar Significance Conflicts',
    rtMeta: ({ model }) => ({
      Header: StandardHeader(model.title, model.description),
      className: 'fs-9',
    }),
    configurableMultiline: true,
    cellRenderer: ({ model }) => (props) => {
      const v = _.get(props.original, 'clinvar.conflict');
      if (!v) return null;
      const provider = (model) => {
        const cat = categoryMap[`${v.cat}`] || '';
        const array = [];
        if (!model.multiline) {
          array.push(`${cat} (${_.map(v.counts, (value, key) => `${key}: ${value}`).join(', ')})`);
          return array;
        }
        array.push(cat);
        _.forEach(v.counts, (value, key) => {
          array.push(`${key}: ${value}`);
        });

        return array;
      };
      return <Multiline model={model} provider={provider} />;  
    },
  },

});

function registerColumns(registry) {
  const templates = columnTemplates({ defaultYouCan: registry.defaultYouCan });
  _.forEach(templates, (value, key) => {
    registry.templates[key] = value;
  });
}

export { registerColumns };
