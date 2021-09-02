// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { Label, Popup } from 'semantic-ui-react';

import { niceNumber } from '../../../../helpers/utils';
import { ParentColumnModel } from '../types/ParentColumn';
import ParentChildEditor from '../editors/ParentChildEditor';
import { StandardHeader } from './helpers';

// ==================================================================
// Some helper functions to start with
// ==================================================================
const isFloat = (n) => {
  return n % 1 !== 0;
}

const nice = (num) => {
  if (!_.isNumber(num)) return 'N/A';
  return isFloat(num)? num.toFixed(8) : niceNumber(num);
}

const buildSubColumn = (id, title, description, labels = [], enabled = false, align = 'center') => ({
  id,
  enabled,
  description,
  labels,
  title,
  rtMeta: ({ model }) => ({
    Header: StandardHeader(model.title, model.description),
    className: `fs-9 ${align}`,
  }),
});

const colorRenderer = (key) => ({ model }) => (props) =>  {
  const inProgress = _.get(props.original, ['vciStatus', key, 'i']);
  const provisional = _.get(props.original, ['vciStatus', key, 'p']);
  const approved = _.get(props.original, ['vciStatus', key, 'a']);
  const toPopup = (num, color, tip) => {
    const props = { circular: true, size: "mini", className: "mr1 cursor-pointer" };
    if (color) props.color = color;
    return <Popup trigger={<Label {...props}>{nice(num)}</Label>} content={tip} />
  };

  return (<React.Fragment>
    {approved > 0 && toPopup(approved, 'green', 'Approved')}
    {provisional > 0 && toPopup(provisional, 'blue', 'Provisional')}
    {inProgress > 0 && toPopup(inProgress, 'orange', 'In Progress')}
  </React.Fragment>);
};

const wordRenderer = (key) => ({ model }) => (props) =>  {
  const inProgress = _.get(props.original, ['vciStatus', key, 'i']);
  const provisional = _.get(props.original, ['vciStatus', key, 'p']);
  const approved = _.get(props.original, ['vciStatus', key, 'a']);
  const text = (value, p) => `${value? `${nice(value)} ${p}  `: ''}`;
  const altTitle = `${text(approved, 'Approved')}${text(provisional, 'Provisional')}${text(inProgress, 'In Progress')}`;
  return (<span title={altTitle}>
    {approved > 0 && <span color="green" size="mini" className="mr1 fs-7">{nice(approved)} Approved</span>}
    {provisional > 0 && <span color="blue" size="mini" className="mr1 fs-7">{nice(provisional)} Provisional</span>}
    {inProgress > 0 && <span color="orange" size="mini" className="mr1 fs-7">{nice(inProgress)} In Progress</span>}
  </span>);
};

// ==================================================================
// A collection of vic column templates
// ==================================================================
const columnTemplates = ({ defaultYouCan }) => ({

  // ----------------------------------------------------------------
  // VCI Interpretations (colored)
  // ----------------------------------------------------------------
  'tpl-vci-inter-colored': {
    title: 'VCI Interpretations (colored)',
    description: <div>This column displays the summary counts of approved and provisional status records in interpretations that are initiated for a variant grouped by all individuals or affiliates using the <b>Variant Curation Interface</b>.
      Interpretations that are currently in progress are also included. The count of each status of the interpretations has a different color.<br/><br/>
      <Label color="green" size="mini" className="width-50-px">Green</Label> for <b>Approved</b><br/>
      <Label color="blue" size="mini" className="width-50-px">Blue</Label> for <b>Provisional</b><br/>
      <Label color="orange" size="mini" className="width-50-px">Orange</Label> for <b>In Progress</b><br/><br/>
      You can choose which sub column to display.</div>,
    cat: 'VCI Interpretations',
    youCan: ['Select the sub columns to display', ...defaultYouCan, ],
    // headerColorId: 'queueBlue',
    rtMeta: ({ model, columns }) => ({
      Header: StandardHeader(model.title, model.description),
      className: 'fs-9',
      columns,
    }),
    columns: [{ // these are columns templates that are recognized by the CompositeColumnModel (previously known as ParentColumnModel)
      ...buildSubColumn('affiliates', 'By Affiliates', 'TODO', [], true),
      cellRenderer: colorRenderer('a'), // "a" for "affiliate"
    }, {
      ...buildSubColumn('individuals', 'By Individuals', 'TODO', [], true),
      cellRenderer: colorRenderer('d'), // "d" for "individuals"
    },
  ],
    editor: ({ model }) => <ParentChildEditor model={model}/>,
    type: ParentColumnModel,
  },

  // ----------------------------------------------------------------
  // VCI Interpretations
  // ----------------------------------------------------------------
  'tpl-vci-inter': {
    title: 'VCI Interpretations',
    description: <div>This column displays the summary counts of approved and provisional status records in interpretations that are initiated for a variant grouped by all individuals or affiliates using the <b>Variant Curation Interface</b>.
    Interpretations that are currently in progress are also included. You can choose which sub column to display.</div>,
    cat: 'VCI Interpretations',
    youCan: ['Select the sub columns to display', ...defaultYouCan, ],
    // headerColorId: 'queueBlue',
    rtMeta: ({ model, columns }) => ({
      Header: StandardHeader(model.title, model.description),
      className: 'fs-9',
      columns,
    }),
    columns: [{ // these are columns templates that are recognized by the CompositeColumnModel (previously known as ParentColumnModel)
      ...buildSubColumn('affiliates', 'By Affiliates', 'TODO', [], true),      
      cellRenderer: wordRenderer('a') // "a" for "affiliate"
    }, {
      ...buildSubColumn('individuals', 'By Individuals', 'TODO', [], true),
      cellRenderer: wordRenderer('d') // "d" for "individuals"
    },
  ],
    editor: ({ model }) => <ParentChildEditor model={model}/>,
    type: ParentColumnModel,
  },

});

function registerColumns(registry) {
  const templates = columnTemplates({ defaultYouCan: registry.defaultYouCan });
  _.forEach(templates, (value, key) => {
    registry.templates[key] = value;
  });
}

export { registerColumns };
