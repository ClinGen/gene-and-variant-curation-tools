// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { decorate, action } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { Form, Button, Header, Label, Segment, Dimmer, Loader, Message, Table } from 'semantic-ui-react';

import { maxCaidsToSearch } from '../../../helpers/settings';
import { displayError } from '../../../helpers/notification';

// IMPORTANT:  this component is used in multiple places, for example, it is used in the search home page and in the load saving dialog
// expected props
// - search (type => CaSearch)
class CaInput extends React.Component {

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
      if (result && !result.isReview) this.props.onResultAvailable(result, search);
      if (!result) displayError('Something went wrong - no search results in /ui/src/parts/search/step1/CaInput.js');
    } catch(error) {
      // we don't have to handle errors captured by the search, we only need to display errors
      // that are not captured by the search
      if (!search.errorMessage) displayError(error);
    }
  });

  handleGroup = action(async(gene) => {
    const search = this.getSearch();
    const review = search.review;
    const result = review.groups[gene].result;
    search.selectGroup(gene);
    this.props.onResultAvailable(result, search);
  });

  handleCancelReview = action(async() => {
    const search = this.getSearch();
    search.cancelReview();
    window.scrollTo(0, 0);
    if (_.isFunction(this.props.onCancel)) this.props.onCancel();
  });

  render() {
    const search = this.getSearch();
    const disabled = search.processing || this.props.disabled;
    const loading = search.processing;
    const input = search.input;
    const errorMessage = search.errorMessage;
    const hasError = errorMessage !== '';
    const hasReview = !!search.review;

    return (
      <Segment basic className="animated fadeIn p0">
        <Dimmer inverted active={disabled}>
        { loading && <Loader size='large'>This might take 10 to 300 seconds</Loader> }
        </Dimmer>
        { !hasReview && <React.Fragment>
          <Header textAlign="left" className="mb2" as="h3" color={ hasError? 'red' : 'grey'}>Enter A List of Canonical Allele Identifiers <span className="color-orange">(CAids)</span></Header>
          <Form onSubmit={this.handleSubmit}>
            <Form.Field>
              <Form.TextArea rows={10} placeholder={`A list of CAids separated by commas, up to ${maxCaidsToSearch} ids`} error={hasError} size="big" disabled={true/*disabled*/} value={input} onChange={this.handleInput}/>
              <Button type="submit" disabled={true/*disabled*/} color="blue" size="large">Search</Button>
              { hasError  && <Label basic color="red" pointing size="big">{errorMessage}</Label> }
            </Form.Field>
          </Form>
          </React.Fragment>
        }
        { hasReview && this.renderReview(search.review) }
      </Segment>
    );
  }

  renderReview(review) {
    const groups = review.groups;
    const groupsCount = _.size(groups);
    let message = null;

    if (groupsCount === 1) {
      message = ( <Message warning className="mb3"
        header="Not all CAids are available"
        content="Some of the CAids you provided are not available, please review the error messages next to the impacted CAids. You can choose to proceed with the available CAids."
      />);
    } else if (groupsCount > 1) {
      message = ( <Message warning className="mb3"
        header="Choose a group"
        content="The list of CAids belongs to more than one gene. Please choose a gene from the list below to continue."
      />);
    }

    return (<React.Fragment>
      <Segment clearing>
        { message }
        { _.map(groups, (group, gene) => <div className="mb3" key={gene}>
          <Segment>
            <Button floated="right" color="blue" onClick={() => this.handleGroup(gene) }>Use this group</Button>
            <Header className="mt0"><b>Gene</b> <span className="color-blue">{gene}</span></Header>
            { _.map(group.input, (caid) => <Label key={caid} className="mr2 mb1">{caid}</Label>) }
          </Segment>
        </div>)}
        { this.renderErrors(review.errors) }
        <Button floated="right" className="mt2" onClick={this.handleCancelReview}>Cancel</Button>
      </Segment>
    </React.Fragment>
    );
  }

  renderErrors(errors) {
    if (errors.length === 0) return null;
    const msg = errors.length === 1 ? 'The following CAid could not be processed' : 'The following CAids could not be processed';

    return (<React.Fragment>
      <Message warning className="mb2" header="Problem" content={msg} />
      <Table celled size="small">
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>CAid</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Message</Table.HeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          { _.map(errors, (error) => (
            <Table.Row key={error.caid} warning>
              <Table.Cell>{error.caid}</Table.Cell>
              <Table.Cell>{_.startCase(error.status)}</Table.Cell>
              <Table.Cell>{error.message}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </React.Fragment>);
  }
}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(CaInput, {
});

export default inject()(withRouter(observer(CaInput)));
