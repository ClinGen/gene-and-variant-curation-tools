// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';

import { StandardHeader, Multiline } from './helpers';

// ==================================================================
// A collection of essential column templates
// ==================================================================

const columnTemplates = ({ defaultYouCan }) => ({
  'tpl-caid': {
    title: 'CA id',
    description: <div>This is the <b>Canonical Allele Identifier</b> from the ClinGen Allele Registry.</div>,
    rtMeta: ({ model }) => ({
      Header: StandardHeader(model.title, model.description),
      // accessor: 'caid',
      className: 'fs-9',
      // width: 110,
    }),
    cellRenderer: ({ model }) => (props) => props.original.caid,
  },
  'tpl-clingen-preferred-title': {
    // changed language to Standardized Nomenclature from ClinGen Preferred Title
    title: 'Standardized Nomenclature',
    rtMeta: ({ model }) => ({
      Header: StandardHeader(model.title, model.description),
      className: 'fs-9',
    }),
    cellRenderer: ({ model }) => (props) => props.original.clingenPreferredTitle,
  },
  'tpl-mc': {
    title: 'Molecular Consequences',
    description: <div>The VP uses <b>MANE v.0.93</b> transcripts</div>,
    rtMeta: ({ model }) => ({
      Header: StandardHeader(model.title, model.description),
      className: 'fs-9',
    }),
    configurableMultiline: true,
    cellRenderer: ({ model }) => (props) => <Multiline model={model} value={props.original.mc} />,
  },
  'tpl-grch38': {
    title: 'GRCh38',
    rtMeta: ({ model }) => ({
      Header: StandardHeader(model.title, model.description),
      className: 'fs-9',
    }),
    cellRenderer: ({ model }) => (props) => { const v = props.original.grch38HGVS;  return <span title={v}>{v}</span> },
  },
  'tpl-grch37': {
    title: 'GRCh37',
    rtMeta: ({ model }) => ({
      Header: StandardHeader(model.title, model.description),
      className: 'fs-9',
    }),
    cellRenderer: ({ model }) => (props) => { const v = props.original.grch37HGVS;  return <span title={v}>{v}</span> },
  },
  'tpl-hgvs-exp': {
    title: 'HGVS Expressions',
    rtMeta: ({ model }) => ({
      Header: StandardHeader(model.title, model.description),
      className: 'fs-9',
    }),
    configurableMultiline: true,
    cellRenderer: ({ model }) => (props) => <Multiline model={model} value={props.original.hgvsExp} />,
  },
  'tpl-protein-fx': {
    title: 'Proteins Effects',
    rtMeta: ({ model }) => ({
      Header: StandardHeader(model.title, model.description),
      className: 'fs-9',
    }),
    configurableMultiline: true,
    cellRenderer: ({ model }) => (props) => <Multiline model={model} value={props.original.proteinEffects} />,
  },
});

function registerColumns(registry) {
  const templates = columnTemplates({ defaultYouCan: registry.defaultYouCan });
  _.forEach(templates, (value, key) => {
    registry.templates[key] = value;
  });
}

export { registerColumns };
