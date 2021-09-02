// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import React from 'react';
import { decorate, action } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { Form, Button, Header, Label, Segment, Dimmer, Loader } from 'semantic-ui-react';

import { maxHgvsToSearch } from '../../../helpers/settings';
import { displayError } from '../../../helpers/notification';

class HgvsInput extends React.Component {

  getSearch() {
    return this.props.search;
  }

  handleInput = action((event, data) => {
    this.getSearch().setInput(data.value);
  });

  handleSubmit = action(async() => {
    const search = this.getSearch();

    try {
      const result = await search.doSearch();
      this.props.onResultAvailable(result, search);
    } catch(error) {
      // we don't have to handle errors captured by the search, we only need to display errors
      // that are not captured by the search
      if (!search.errorMessage) displayError(error);
    }
  });

  render() {
    const search = this.getSearch();
    const disabled = search.processing || this.props.disabled;
    const loading = search.processing;
    const input = search.input;
    const errorMessage = search.errorMessage;
    const hasError = errorMessage !== '';

    return (
      <Segment basic className="animated fadeIn p0">
        <Dimmer inverted active={disabled}>
        { loading && <Loader size='large'>This might take 10 to 300 seconds</Loader> }
        </Dimmer>
        <Header textAlign="left" className="mb2" as="h3" color={ hasError? 'red' : 'grey'}>Enter A List of <span className="color-orange">HGVS</span> Expressions</Header>
        <Form onSubmit={this.handleSubmit}>
          <Form.Field>
            <Form.TextArea rows={10} placeholder={`A list of HGVS expressions (one per line and up to ${maxHgvsToSearch} expressions)`} error={hasError} size="big" disabled={true/*disabled*/} value={input} onChange={this.handleInput}/>
            <Button type="submit" disabled={true/*disabled*/} color="blue" size="large">Search</Button>
            { hasError  && <Label basic color="red" pointing size="big">{errorMessage}</Label> }
          </Form.Field>
        </Form>        
      </Segment>
    );
  }

}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(HgvsInput, {
});

export default inject('searchWizard')(withRouter(observer(HgvsInput)));