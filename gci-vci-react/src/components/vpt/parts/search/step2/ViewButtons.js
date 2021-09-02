// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { decorate, action } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { Button } from 'semantic-ui-react';

import { niceNumber } from '../../../helpers/utils';
import { TableViews } from '../../../models/table/Table';

class ViewButtons extends React.Component {

  getTableModel() {
    return this.props.tableModel;
  }

  handleSelected = action((viewName) => {
    const tableModel = this.getTableModel();
    tableModel.setViewName(viewName);    
  });

  render() {
    const disabled = this.props.disabled;
    const tableModel = this.getTableModel();
    const totals = tableModel.sortedData.totals;
    const l = (num) => <span className="pr1">{niceNumber(num)}</span>;
    const currentView = tableModel.viewName;
    const ordered = TableViews.ordered;
    const hasFilters = tableModel.hasFilters;
    const isDisabled = (name) => TableViews.views[name].isFiltersBased && !hasFilters;
    const isCurrent = (name) => name === currentView;
    return (
      <Button.Group size="mini" className="mt1" floated="right">
        { _.map(ordered, (name) => <Button key={name} basic={!isCurrent(name)} disabled={isDisabled(name) || disabled} color="blue" onClick={() => this.handleSelected(name)}>{l(totals[name])} {TableViews.views[name].title}</Button>)}
      </Button.Group>
    );
  }
}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(ViewButtons, {
});

export default inject()(withRouter(observer(ViewButtons)));