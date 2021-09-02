// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { observer } from 'mobx-react';
import { Popup } from 'semantic-ui-react';

// ==================================================================
// Some helper functions
// ==================================================================

// const StandardHeader = (title, description) => <Popup trigger={<span className="cursor-pointer" >{title} <Icon name="help" className="align-top" size="tiny"/></span>} content={<div><div className="bold center mb1">{title}</div>{description}</div>}/>;
const StandardHeader = (title, description) => <Popup trigger={<span className="cursor-pointer" >{title}</span>} content={<div><div className="bold center mb1">{title}</div>{description}</div>}/>;

const Multiline = observer(({ model, value, provider }) => {
  const isMultiline = model.multiline;
  const array = value || (_.isFunction(provider) ? provider(model) : []);
  if (!array || array.length === 0) return '';
  if (!isMultiline) {
    const v = array.join(', ');
    return <span title={v}>{v}</span>;
  }
  return _.map(array, (item, index) => <span key={index} className="block" title={item}>{item}</span>);
});

export { StandardHeader, Multiline };