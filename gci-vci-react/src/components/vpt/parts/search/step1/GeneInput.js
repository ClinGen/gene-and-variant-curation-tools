// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import React from 'react';
import { decorate, action } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { Input, Form, Button, Header, Label, Dimmer, Loader, Segment, Message } from 'semantic-ui-react';

import { EXTERNAL_API_MAP } from "../../../../../constants/externalApis";
import { ExternalLink } from "../../../../common/ExternalLink";
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
        ABCC8, ACADVL, ACTC1, ALX4, ANKRD26, APOB, ARSE, BARD1, BLK, BMPR1A, BRCA1, BRCA2, BRIP1,
        CDH1, CDKL5, CEBPA, CFTR, CHEK2, COCH, CYP1B1, DDX41, DICER1, EPCAM, ERF, ETHE1, ETV6, F8, F9
        FBN1, FOXG1, GAA, GALNT12, GATA2, GCK, GJB2, GLA, GP1BA, GP1BB, GP9, GREM1, HNF1A, HNF1B, HNF4A,
        HRAS, IDUA, INS, ITGA2B, ITGB3, KCNJ11, KCNQ4, KLF11, KLLN, KRAS, LDLR, LRRC56, MAP2K1, MAP2K2, MECP2,
        MLH1, MSH2, MSH3, MSH6, MSX2, MTOR, MUTYH, MYBPC3, MYH7, MYL2, MYL3, MYO7A, MYOC, NTHL1, PAH, PALB2, PAX4, 
        PCSK9, PDHA1, PIK3CA, PIK3R2, PLN, PMS2, POLD1, POLE, POLG, PTEN, PTPN11, RAD51C, RAD51D, RAF1, RUNX1, RYR1, 
        SCN5A, SHOC2, SLC26A4, SLC9A6, SMAD4, SMAD6, SOS1, STK11, TECTA, TNNI3, TNNT2, TP53, TPM1, TWIST1, VHL, ZIC1
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
        { loading && <Loader size='large'>Searching may take up to 120 seconds</Loader> }
        </Dimmer>
        <Header textAlign="left" className="mb2" as="h3" color={ hasError? 'red' : 'grey'}>
          Enter an <span className="color-orange">HGNC </span>Approved Gene Symbol 
          <ExternalLink
            href={`${EXTERNAL_API_MAP["HGNCHome"]}`}
            title="HGNC"
          />
        </Header>
        <Form onSubmit={this.handleSubmit}>
          <Form.Field>
            <Input error={hasError} fluid action size="big" disabled={disabled} value={input} placeholder="Type a gene symbol, such as PAH (see list of currently supported genes below)" onChange={this.handleInput}>
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