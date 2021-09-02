// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { connect } from 'react-redux';
import { decorate, reaction, runInAction } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import TimeAgo from 'react-timeago';
import { Breadcrumb, Header, Message, Table, Label } from 'semantic-ui-react';

import { isStoreLoading, isStoreReady, isStoreError, isStoreReloading } from '../../models/base';
import { niceNumber } from '../../helpers/utils';
import { createLink, createLinkWithSearch } from '../../helpers/routing';
import { swallowError } from '../../helpers/errors';
import Progress from '../helpers/Progress';
import ErrorBox from '../helpers/ErrorBox';

// expected props
// - exportOperationsStore (via injection)
class ExportsListing extends React.Component {

  goto(pathname, search) {
    const location = this.props.location;
    let link
    if (search) link = createLinkWithSearch({ location, pathname, search });
    else link = createLink({ location, pathname });
    this.props.history.push(link);
  }

  attemptToLoadExports = () => {
    const store = this.getStore();
    if (isStoreLoading(store) || isStoreReloading(store)) {
      // the store is busy either loading or reloading, so lets schedule another attempt
      if (this.intervalId) return; // no need to schedule one, since one already is in motion
      this.intervalId = setInterval(() => this.attemptToLoadExports(), 1000);
    } else {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = undefined;
      }
      swallowError(store.load({ affiliation: this.getAffiliation() }));
    }
  }

  componentDidMount() {
    window.scrollTo(0, 0);
    const store = this.getStore();
    const determineAffiliation = () => this.getAffiliation();
    this.disposer = reaction(determineAffiliation, this.attemptToLoadExports);
    this.attemptToLoadExports();
    store.startHeartbeat();
  }

  componentWillUnmount() {
    runInAction(() => {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = undefined;
      }
      if (this.disposer) this.disposer();
      const store = this.getStore();
      store.stopHeartbeat();  
    });
  }

  getStore() {
    return this.props.exportOperationsStore;
  }

  getUser() {
    return (this.props.userStore && this.props.userStore.user) || {};
  }

  getAffiliation() {
    return this.props.auth && this.props.auth.currentAffiliation && this.props.auth.currentAffiliation.affiliation_id
      ? this.props.auth.currentAffiliation.affiliation_id
      : null;
  }

  render() {
    const store = this.getStore();
    const affiliation = this.getAffiliation();
    const list = store && isStoreReady(store) && store.getListByAffiliation(affiliation);

    let content = null;

    if (isStoreError(store)) {
      content = <ErrorBox error={ store.error }/>;
    } else if (isStoreLoading(store)) {
      content = <Progress/>;
    } else if (isStoreReady(store) && _.isEmpty(list)) {
      content = this.renderEmpty();
    } else if (isStoreReady(store)) {
      content = this.renderMain();
    } else {
      content = null;
    }

    return (
      <div className="animated fadeIn ml3 mr3">
        <Breadcrumb size="mini">
          <Breadcrumb.Section link onClick={() => this.goto('/vp/search')}>Home</Breadcrumb.Section>
          <Breadcrumb.Divider />
          <Breadcrumb.Section active>My Exports</Breadcrumb.Section>
        </Breadcrumb>
        <div className="mt2">
          <Header as="h3" className="mb2">My Exports</Header>
          { content }
        </div>
      </div>
    );
  }

  renderEmpty() {
    const affiliation = this.getAffiliation();
    const hasAffiliation = affiliation && affiliation !== 'SELF';
    return <Message visible>There are no exports to list {hasAffiliation? 'for this affiliation': ''}</Message>
  }

  renderMain() {
    const email = 'email';
    const store = this.getStore();
    const affiliation = this.getAffiliation();
    const hasAffiliation = affiliation && affiliation !== 'SELF';
    const list = store.getListByAffiliation(affiliation);

    return (
      <Table celled striped selectable>
        <Table.Header>
          <Table.Row>
            {/* <Table.HeaderCell className="width-120-px"></Table.HeaderCell> */}
            <Table.HeaderCell className="width-100-px">Status</Table.HeaderCell>
            <Table.HeaderCell>Exported</Table.HeaderCell>
            { hasAffiliation && <Table.HeaderCell>Affiliation</Table.HeaderCell> }
            <Table.HeaderCell>By</Table.HeaderCell>
            <Table.HeaderCell>Variants Count</Table.HeaderCell>
            <Table.HeaderCell>Gene</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
        { _.map(list, (entry, index) => <Table.Row key={index} className="cursor-pointer" onClick={() => this.goto('/vp/exports/detail', `exportId=${entry.id}`)}>
          {/* <Table.Cell><Button as="a" size="mini">View Details</Button></Table.Cell> */}
          <Table.Cell>{this.renderStatus(entry)}</Table.Cell>
          <Table.Cell><TimeAgo date={entry.date_created}/></Table.Cell>
          { hasAffiliation && <Table.Cell>{entry.affiliationName}</Table.Cell> }
          <Table.Cell><Label color={entry.email === email? 'blue': 'orange'} size="tiny">{entry.title}</Label></Table.Cell>
          <Table.Cell>{niceNumber(entry.stats.total)}</Table.Cell>
          <Table.Cell>{entry.geneName}</Table.Cell>
        </Table.Row>) }
        </Table.Body>
      </Table>
    );
  }

  renderStatus(entry) {
    const status = entry.status;
    const hasError = entry.stats.errored > 0 || status === 'failed';

    if (hasError) return <Label size="mini" color="red">Error</Label>;
    if (status === 'completed') return <Label size="mini" color="teal">Completed</Label>;
    if (status === 'in_progress' || status === 'not_started') return <Label size="mini" color="orange">Pending</Label>;
    return <Label size="mini">Unknown</Label>;
  }
}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(ExportsListing, {
});

const mapStateToProps = state => ({ auth: state.auth });

export default connect(mapStateToProps)(inject('exportOperationsStore')(withRouter(observer(ExportsListing))));