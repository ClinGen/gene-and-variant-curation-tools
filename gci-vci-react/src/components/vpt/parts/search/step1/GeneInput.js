// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import React from 'react';
import { decorate, action } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { Input, Form, Button, Container, Header, Label, Dimmer, Loader, Segment, Message } from 'semantic-ui-react';

import { displayError } from '../../../helpers/notification';

class GeneInput extends React.Component {

  getSearch() {
    return this.props.search;
  }

  handleInput = action((event, data) => {
    this.getSearch().setInput(data.value.toUpperCase());
  });

  handleSubmit = action(async() => {
    const search = this.getSearch();
    try {
      const result = await search.doSearch();
      // const errors = _.get(result, 'errors', []);
      // TODO deal with these kinds of errors, they are not server or input errors, they
      // are data integrity errors
      this.props.onResultAvailable(result, search);
    } catch(error) {
      // we don't have to handle errors captured by the search, we only need to display errors
      // that are not captured by the search
      if (!search.errorMessage) displayError(error);
    }
  });

  renderGeneSearchNotice = () => (
    <Message info compact>
      <Message.Header>Currently supported genes:</Message.Header>
      <p>
        APOB, ATM, CDH1, CDKL5, COCH, DDX41, FOXG1, GAA, GATA2, GJB2, GLA, HRAS, 
        KCNQ4, KRAS, LDLR, MAP2K1, MAP2K2, MECP2, MYH7, MYO6, MYO7A, PAH, PALB2, 
        PTEN, PTPN11, RAF1, RUNX1, RYR1, SCN5A, SHOC2, SLC26A4, SOS1, TECTA, TP53, and TPM1.
      </p>
    </Message>
  );

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
        <Header textAlign="left" className="mb2" as="h3" color={ hasError? 'red' : 'grey'}>Enter A <span className="color-orange">Gene</span> Name</Header>
        <Form onSubmit={this.handleSubmit}>
          <Form.Field>
            <Input error={hasError} fluid action size="big" disabled={disabled} value={input} placeholder="Type a gene name, such as PAH" onChange={this.handleInput}>
              <input/>
              <Button type="submit" disabled={disabled} color="blue" size="large">Search</Button>
            </Input>
            { hasError  && <Label basic color="red" pointing size="big">{errorMessage}</Label> }
          </Form.Field>
        </Form>
        { this.renderGeneSearchNotice() } 
      </Segment>
    );
  }

}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(GeneInput, {
});

export default inject('searchWizard')(withRouter(observer(GeneInput)));