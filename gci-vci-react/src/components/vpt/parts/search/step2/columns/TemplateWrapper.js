// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import React from 'react';
import { decorate } from 'mobx';
import { observer } from 'mobx-react';
import { Draggable } from 'react-beautiful-dnd';

// import PortalItem from '../PortalItem';
import Template from './Template';

class TemplateWrapper extends React.Component {

  render() {
    const index = this.props.index;
    const template = this.props.template;

    return (
      <Draggable draggableId={template.id} index={index}>
      { (provided, snapshot) => (
          // <React.Fragment>
          //  <PortalItem provided={provided} snapshot={snapshot} className="mb1">
          <Template provided={provided} snapshot={snapshot} template={template} className="mb1"/>
          //  </PortalItem>
          //  {snapshot.isDragging &&  ...}
          // </React.Fragment>
      ) }
      </Draggable>
    );
  }
}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(TemplateWrapper, {
});

export default observer(TemplateWrapper);