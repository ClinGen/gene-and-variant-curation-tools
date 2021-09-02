// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { observer } from 'mobx-react';
import { Message, Button } from 'semantic-ui-react';

class ErrorBox extends React.Component {

  handleRetry = () => {
    Promise.resolve()
      .then(() => this.props.onRetry())
      .catch((err) => { /* ignore */ });
  }

  render() {
    const defaultMessage = 'Something went wrong - in /ui/src/parts/helpers/ErrorBox.js';
    const rawMessage = this.props.error || defaultMessage;
    let message = _.isString(rawMessage) ? rawMessage : _.get(rawMessage, 'message', defaultMessage);
    const shouldRetry = _.isFunction(this.props.onRetry);
    const code = _.get(rawMessage, 'code');
    if (code === 'invalidToken') message = 'Your session has expired. Please login again.';

    return (
      <Message negative className="mt2 mb2 clearfix">
        <Message.Header>A problem was encountered</Message.Header>
        <p>{message}</p>
        { shouldRetry && <Button floated="right" basic color="red" onClick={ this.handleRetry }>Retry</Button> }
      </Message>
    );
  }
}

export default observer(ErrorBox);
