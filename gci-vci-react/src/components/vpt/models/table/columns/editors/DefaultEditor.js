// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { decorate } from 'mobx';
import { observer, inject } from 'mobx-react';
import { Segment } from 'semantic-ui-react';

import TitleEditor from './TitleEditor';
import ColorEditor from './ColorEditor';

// expected props
// - model (the columnModel)
// - colorsRepo (via injection)
class DefaultEditor extends React.Component {

  getModel() {
    // this is the columnModel
    return this.props.model;
  }
  
  getColorsRepo() {
    return this.props.colorsRepo;
  }

  render() {
    const model = this.getModel();
    const description = model.description;
    const hasDescription = !!description;
    const hasLabels = !_.isEmpty(model.labels);
    const colorsRepo = this.getColorsRepo();
    const disabled = !model.enabled;

    return (
      <React.Fragment>
        <div className="flex">
          <TitleEditor disabled={disabled} className="mb2 flex-auto mr2" model={model}/>
          <div className={hasLabels? 'mt-1point5rem': ''}>
            <ColorEditor disabled={disabled} title="Header" colors={colorsRepo.headerColors} color={model.headerColor} onChange={(colorId) => model.setHeaderColorId(colorId)}/>
            <ColorEditor disabled={disabled} title="Body" colors={colorsRepo.bodyColors} color={model.bodyColor} onChange={(colorId) => model.setBodyColorId(colorId)}/>
          </div>
        </div>
        { hasDescription && <Segment secondary={true} className={`mb2 mt0 ${disabled? 'opacity-45': ''}`}>{description}</Segment>}
      </React.Fragment>
    );
  }

}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(DefaultEditor, {
});

export default inject('colorsRepo')(observer(DefaultEditor));