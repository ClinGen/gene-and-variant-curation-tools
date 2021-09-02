// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { observer } from 'mobx-react';
import { Message, Button } from 'semantic-ui-react';

class WarningBox extends React.Component {

  handleRetry = () => {
    Promise.resolve()
      .then(() => this.props.onRetry())
      .catch((err) => { /* ignore */ });
  }

  render() {
    const defaultMessage = 'Hmm... something is needing your attention';
    const rawMessage = this.props.warning || defaultMessage;
    const message = _.isString(rawMessage) ? rawMessage : _.get(rawMessage, 'message', defaultMessage);
    const shouldRetry = _.isFunction(this.props.onRetry);

    return (
      <Message warning className="mt2 mb2 clearfix">
        <Message.Header>Warning</Message.Header>
        <p>{message}</p>
        { shouldRetry && <Button floated="right" basic color="brown" onClick={ this.handleRetry }>Retry</Button> }
      </Message>
    );
  }
}

export default observer(WarningBox);