// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { decorate, action } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { Message, Label, Button } from 'semantic-ui-react';

import CaInput from '../search/step1/CaInput';
import ErrorBox from '../helpers/ErrorBox';

// expected props
// - response
// - onDone
// - onCancel
class LoadResponseDialog extends React.Component {

  getResponse() {
    return this.props.response;
  }

  handleResultAvailable = (result) => {
    const response = this.getResponse();
    if (result && !result.isReview) {
      response.setSearchResult(result);
      const { invalid } = response.selections;
      if (_.isEmpty(invalid)) {
        response.conclude();
        this.props.onDone();
      }
    }
  };

  handleContinue = () => {
    const response = this.getResponse();
    response.conclude();
    this.props.onDone();
  };

  render() {
    const response = this.getResponse();
    const { invalid } = response.selections;
    if (!_.isEmpty(invalid)) return this.renderInvalidSelections(invalid);
    const search = response.search;
    const error = <ErrorBox error="Unable to handle this type of search"/>;
    if (!search) return error;
    if (search.type === 'caids') {
      return <CaInput search={search} onResultAvailable={this.handleResultAvailable} onCancel={this.props.onCancel} />;
    }

    return error;
  }

  renderInvalidSelections(invalid) {
    const max = 20;
    const size = invalid.length;
    const remaining = size - max;
    const hasRemaining = remaining > 0;
    const toShow = _.slice(invalid, 0, max);

    let message;
    if (size === 1) {
      message = ( <Message warning className="mb3"
        header="Warning"
        content="The following CAid is no longer a valid selection. It will be ignored."
      />);
    } else if (size > 1) {
      message = ( <Message warning className="mb3"
        header="Warning"
        content="The following CAids are no longer valid selections. They will be ignored."
      />);
    }

    return (
      <div className="animated fadeIn clearfix">
        { message }
        { _.map(toShow, (caid) => <Label key={caid} className="mr2 mb1">{caid}</Label>) }
        { hasRemaining && <span className="ml1">and {remaining} more not shown here</span> }
        <div className="mt2">
          <Button primary floated="right" onClick={this.handleContinue}>Continue</Button>
          <Button floated="right" className="mr2" onClick={this.props.onCancel}>Cancel</Button>
        </div>
      </div>
    );
  }
}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(LoadResponseDialog, {
  handleResultAvailable: action,
  handleContinue: action,
});

export default inject()(withRouter(observer(LoadResponseDialog)));