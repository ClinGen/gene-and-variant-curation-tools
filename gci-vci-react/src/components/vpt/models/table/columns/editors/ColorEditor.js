// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { decorate } from 'mobx';
import { observer, inject } from 'mobx-react';
import { Dropdown, Dimmer } from 'semantic-ui-react';

// expected props
// - title
// - colors (an array of color objects from the colors repo)
// - color (the selected color)
// - onChange(colorId) a callback
// - className (optional)
class ColorEditor extends React.Component {

  renderOLD() {
    return <div><DropdownExampleDropdown/></div>;
  }

  render() {
    const { title, colors, color } = this.props;
    const isMatch = (id) => id === color.id;
    const disabled = this.props.disabled;

    return (
      <Dimmer.Dimmable className={`flex ${this.props.className}`}>
        <Dimmer active={disabled} inverted/>
        <span className="fs-8 mr1 flex-auto">{title}</span>
        <div>
          <div className="flex border-top border-left border-right">
            { _.map(colors, (color, index) => <div key={index} style={{ backgroundColor: color.bg, color: color.txt }}
              className="p1 cursor-pointer width-18-px" onClick={ () => this.props.onChange(color.id) }></div> ) }
          </div>
          <div className="flex border-top">
            { _.map(colors, (color, index) => <div key={index} 
            className={`cursor-pointer width-18-px ${isMatch(color.id)? 'color-selected-marker': ''}`} onClick={ () => this.props.onChange(color.id) }></div> ) }
          </div>
        </div>
      </Dimmer.Dimmable>
    );
  }
}

const DropdownExampleDropdown = () => (
  <Dropdown text="Color" className="fs-8 width-40-px">
    <Dropdown.Menu direction="left">
      <Dropdown.Item text='New' className="fs-7" />
      <Dropdown.Item text='Open...' description='ctrl + o' />
      <Dropdown.Item text='Save as...' description='ctrl + s' />
      <Dropdown.Item text='Rename' description='ctrl + r' />
      <Dropdown.Item text='Make a copy' />
      <Dropdown.Item icon='folder' text='Move to folder' />
      <Dropdown.Item icon='trash' text='Move to trash' />
      <Dropdown.Divider />
      <Dropdown.Item text='Download As...' />
      <Dropdown.Item text='Publish To Web' />
      <Dropdown.Item text='E-mail Collaborators' />
    </Dropdown.Menu>
  </Dropdown>
);

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(ColorEditor, {
});

export default inject()(observer(ColorEditor));