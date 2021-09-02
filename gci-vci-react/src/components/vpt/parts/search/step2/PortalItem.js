// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import React from 'react';
import ReactDOM from 'react-dom';
import { decorate } from 'mobx';
import { observer } from 'mobx-react';

let portal;

function getPortal() {
  if (portal) return portal;
  portal = document.createElement('div');
  document.body.appendChild(portal);  
  return portal;
}

// Because the columns are displayed inside a sidebar, they have transformation applied to them (the parent)
// this does not work with react-beautiful-dnd because it uses fixed and transform messes with it.
// see https://github.com/atlassian/react-beautiful-dnd/blob/master/docs/patterns/using-a-portal.md
// and https://github.com/atlassian/react-beautiful-dnd/blob/master/stories/src/portal/portal-app.jsx
// and https://github.com/atlassian/react-beautiful-dnd/issues/499
class PortalItem extends React.Component {

  render() {
    const { provided, snapshot, className } = this.props;
    const usePortal = snapshot.isDragging;

    const child = (
      <div {...provided.draggableProps} ref={provided.innerRef} className={className}>
      { this.props.children }
      </div>
    );

    if (!usePortal) {
      return child;
    }

    // if dragging - put the item in a portal
    return ReactDOM.createPortal(child, getPortal());
  }
}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(PortalItem, {
});

export default observer(PortalItem);