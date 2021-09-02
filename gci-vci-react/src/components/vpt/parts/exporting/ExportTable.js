// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { observer } from 'mobx-react';
import ReactTable from 'react-table-6';
import { Icon, Label } from 'semantic-ui-react';

import { vciUrl } from '../../helpers/settings';

// expected props
// - exportOperationStore
class ExportTable extends React.Component {
  getStore() {
    return this.props.exportOperationStore;
  }

  getPayload() {
    const store = this.getStore();
    if (store && store.exportOperation) return store.exportOperation.payload;
  }

  render() {
    const payload = this.getPayload();
    if (!payload) return null;
    const size = _.size(payload.data);
    if (size === 0) return null;

    return (
      <div className="mt4 fs-9">
      <ReactTable
        data={_.slice(payload.data)}
        columns={columns}
        defaultPageSize={_.min([size, 10])}
        className="-striped -highlight"
        SubComponent={messagesSubComponent}
      />
    </div>      
    );
  }
}

const columns = [{
  Header: 'Status',
  id: 'status',
  className: 'left-align',
  maxWidth: 100,
  Cell: (row) => {
    const item = row.original;
    const messagesSize = _.size(item.messages);
    return (<div><Label color={row.original.statusColor} size="mini" content={_.startCase(row.original.status)}/> {messagesSize === 0? '': '*'} </div>);
  },
}, {
  Header: 'VCI Link',
  id: 'link',
  className: 'left-align',
  width: 130,
  Cell: (row) => {
    const item = row.original;
    const variantId = item.variantId;
    const interpretationId = item.interpretationId;
    if (!variantId || !interpretationId) return null;
    return <div className="flex"><a href={`${vciUrl}/variant-central/?edit=true&variant=${variantId}&interpretation=${interpretationId}`} target="_blank" rel="noopener noreferrer">View in VCI</a> <Icon className="fs-9 ml2 mt-3" name="external" size="tiny" /></div>
  }
},
{
  Header: 'CAid',
  id: 'caid',
  className: 'left-align pl2',
  maxWidth: 140,
  accessor: (entry) => _.get(entry, 'item.caid'),
}, {
  Header: 'grch38HGVS',
  id: 'grch38HGVS',
  className: 'left-align pl2',
  maxWidth: 310,
  accessor: (entry) => _.get(entry, 'item.grch38HGVS'),
}, {
  Header: 'grch37HGVS',
  id: 'grch37HGVS',
  className: 'left-align pl2',
  maxWidth: 310,
  accessor: (entry) => _.get(entry, 'item.grch37HGVS'),
}, {
  Header: 'Clinvar Title',
  id: 'clinvarVariantTitle',
  className: 'left-align pl2',
  // maxWidth: 220,
  accessor: (entry) => _.get(entry, 'item.clinvarVariantTitle'),
}];

const messagesSubComponent = (row) => {
  const entry = row.original;
  const parsed = entry.parsedMessages;
  const status = entry.status;
  return (
    <div className="left-align p2 pl3 unwrap-text breakout">
      { _.map(parsed, (msgObj, index) => {
        const level = msgObj.level;
        const msg = msgObj.message;
        if (level === 'error') return <div key={index} className="color-red">{msg}</div>;
        if (level === 'warn') return <div key={index} className="color-orange">{msg}</div>;
        if (level === 'info') return <div key={index} className="color-grey">{msg}</div>;
        })
      }
      { _.isEmpty(parsed) && status !== 'pending' && <div>Processing and creating an interpretation for this variant produced no error or warning messages</div> }
      { _.isEmpty(parsed) && status === 'pending' && <div>This variant is waiting to be processed by the VP backend service</div> }
    </div>
  );
};

export default observer(ExportTable);