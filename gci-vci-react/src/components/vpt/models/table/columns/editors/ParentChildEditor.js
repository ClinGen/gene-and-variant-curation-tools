// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { decorate, action } from 'mobx';
import { observer, inject } from 'mobx-react';
import { Segment, Radio } from 'semantic-ui-react';

import TitleEditor from './TitleEditor';
import ColorEditor from './ColorEditor';

// expected props
// - model (the columnModel)
// - colorsRepo (via injection)
class ParentChildEditor extends React.Component {

  getModel() {
    // this is the columnModel
    return this.props.model;
  }
  
  getColorsRepo() {
    return this.props.colorsRepo;
  }

  handleEnable = action((column, event, data) => {
    column.setEnabled(data.checked);
    event.stopPropagation();
  });

  render() {
    const model = this.getModel();
    const columns = model.columns;
    const description = model.description;
    const hasDescription = !!description;
    const hasLabels = (column) => !_.isEmpty(column.labels);
    const colorsRepo = this.getColorsRepo();
    const disabled = !model.enabled;

    return (
      <React.Fragment>
        <div className={`flex ${!hasDescription? 'mb2': ''}`}>
          <TitleEditor disabled={disabled} className="mb2 flex-auto mr2" model={model}/>
          <div className={!_.isEmpty(model.labels)? 'mt-1point5rem': ''}>
            <ColorEditor disabled={disabled} title="Header" colors={colorsRepo.headerColors} color={model.headerColor} onChange={(colorId) => model.setHeaderColorId(colorId)}/>
          </div>
        </div>
        { hasDescription && <Segment secondary={true} className={`mt0 mb3 ${disabled? 'opacity-45': ''}`}>{description}</Segment> }
        {_.map(columns, (column) => <div key={column.id} className="flex mt2 mb1">
          <Radio disabled={disabled} toggle className={`mr2 mb0 ${hasLabels(column)? 'mt3': 'mt1'}`} checked={column.enabled} onChange={(event, data) => this.handleEnable(column, event, data)}/>
          <TitleEditor disabled={!column.enabled || disabled} className="mb2 flex-auto mr1" model={column}/>
          <div className={hasLabels(column)? 'mt-1point5rem': ''}>
            <ColorEditor disabled={!column.enabled || disabled} title="Header" colors={colorsRepo.headerColors} color={column.headerColor} onChange={(colorId) => column.setHeaderColorId(colorId)}/>
            <ColorEditor disabled={!column.enabled || disabled} title="Body" colors={colorsRepo.bodyColors} color={column.bodyColor} onChange={(colorId) => column.setBodyColorId(colorId)}/>
          </div>
        </div>)}
      </React.Fragment>
    );
  }

}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(ParentChildEditor, {
});

export default inject('colorsRepo')(observer(ParentChildEditor));