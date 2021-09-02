// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { decorate, action } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { Segment, Accordion, Icon, List } from 'semantic-ui-react';

// expected props
// - template
// - provided (drag and drop provided object from react-beautiful-dnd)
class Template extends React.Component {

  handleClick = action(() => {
    const template = this.getTemplate();
    template.observed.showDetail = !template.observed.showDetail;
  });

  getTemplate() {
    return this.props.template;
  }

  render() {
    const template = this.getTemplate();
    const provided = this.props.provided;

    return (
      <div {...provided.dragHandleProps} ref={provided.innerRef} {...provided.draggableProps} className={this.props.className}>
        <Segment size="small" className="p0 pl1 flex">
          {this.renderTemplate(template)}
        </Segment>
        { provided.placeholder }
      </div>
    );
  }

  renderTemplate(template) {
    const opened = template.observed.showDetail;
    const description = template.description;
    const hasYouCan = _.size(template.youCan) > 0;

    return (
      <Accordion className="flex-auto overflow-hidden pr1">
        <Accordion.Title active={opened} index={0} onClick={this.handleClick}>
          <div className="flex">
            <div className="ml1 mr1 mt-1 cursor-grab" ><Icon name="align justify" color="grey"/></div>
            <Icon name="dropdown" className="mt-2" />
            <div className="ellipsis flex-auto">{template.title}</div>
          </div>
        </Accordion.Title>
        <Accordion.Content active={opened} className="p1 mb2">
          {description}
          {hasYouCan && this.renderYouCan(template)}
        </Accordion.Content>
      </Accordion>
    );
  }

  renderYouCan(template) {
    const hasDescription = !!template.description;
    const youCan = template.youCan;

    return (<React.Fragment>
      <div className={`${hasDescription? 'mt2' : ''}`}>Once you drag this column to the <b>Table Columns</b> you will be able to:</div>
      <List bulleted className="mt1">
        { _.map(youCan, (item, index) => <List.Item key={index}>{item}</List.Item>) }        
      </List>
    </React.Fragment>);
  }

}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(Template, {
});

export default inject()(withRouter(observer(Template)));