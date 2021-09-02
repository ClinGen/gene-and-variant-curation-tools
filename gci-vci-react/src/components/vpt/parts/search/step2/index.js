// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { connect } from 'react-redux';
import { decorate, observable, runInAction, action } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { Segment, Button, Dimmer, Header, Icon } from 'semantic-ui-react';

import { allowSampleData } from '../../../helpers/settings';
import { createLink } from '../../../helpers/routing';
import ReadMore from '../../helpers/ReadMore';
import Table from './Table';
import SaveDialog from '../../saving-loading/SaveDialog';
import LoadDialog from '../../saving-loading/LoadDialog';

// expected props
// - app (via injection)
// - searchWizard (via injection)
// - searchSession (via injection)
class Prioritize extends React.Component {

  constructor(props) {
    super(props);
    runInAction(() => {
      this.savingDialogOn = false;
      this.loadingDialogOn = false;
    });
  }

  getWizard() {
    return this.props.searchWizard;
  }

  getSearchSession() {
    return this.props.searchSession;
  }

  goto(pathname) {
    const location = this.props.location;
    const link = createLink({ location, pathname });

    this.props.history.push(link);
  }

  handleCancel = () => {
    this.goto('/vp/search');
  };

  handleOnLoadDone = () => {
    this.getSearchSession().tableModel.setViewName('matched');
    this.savingDialogOn = false;
    this.loadingDialogOn = false;
  };

  handleHideSaveLoadDialog = () => {
    this.savingDialogOn = false;
    this.loadingDialogOn = false;
  };

  showSaveDialog = () => {
    this.savingDialogOn = true;
    this.loadingDialogOn = false;
  };

  showLoadDialog = () => {
    this.savingDialogOn = false;
    this.loadingDialogOn = true;
  };

  componentDidMount() {
    window.scrollTo(0, 0);
    const wizard = this.getWizard();
    const searchSession = this.getSearchSession();
    const ready = searchSession.searchInput !== undefined && searchSession.searchResult !== undefined;
    if (!ready && !allowSampleData) return this.goto('/vp/search');
    if (!ready && allowSampleData) wizard.enableCaidsSampleData();
    this.getWizard().setCurrentStep(2);
  }

  render() {
    const searchSession = this.getSearchSession();
    const ready = searchSession.searchInput !== undefined && searchSession.searchResult !== undefined;
    if (!ready) return null;

    const type = searchSession.searchInput.type;
    const isType = (value) => value === type;
    const loadingDialogOn = this.loadingDialogOn;
    const savingDialogOn = this.savingDialogOn;
    const disabled = savingDialogOn || loadingDialogOn;
    const affiliation = _.get(this.props.auth, 'currentAffiliation');

    return (
      <div className="mt2 animated fadeIn">
        <div className="flex">
          <Segment secondary clearing className="flex flex-auto mr2">
            { isType('gene') && this.renderGeneSearchTerms() }
            { isType('caids') && this.renderCaSearchTerms() }
            <div className="ml2 clearfix nowrap"><Button floated="right" className="nowrap" size="mini" onClick={ this.handleCancel }>Back To Search</Button></div>
          </Segment>
          <div>
            <Button color="teal" disabled={savingDialogOn || loadingDialogOn} onClick={this.showSaveDialog} className="block mb2 width-90-px" size="tiny">Save</Button>
            <Button color="blue" disabled={savingDialogOn || loadingDialogOn} onClick={this.showLoadDialog} className="block width-90-px" size="tiny">Load</Button>
          </div>
        </div>
        { savingDialogOn && affiliation && <SaveDialog onCancel={this.handleHideSaveLoadDialog} onDone={this.handleHideSaveLoadDialog}/> }
        { savingDialogOn && !affiliation && this.renderPlaceHolder()}
        { loadingDialogOn && affiliation && <LoadDialog onCancel={this.handleHideSaveLoadDialog} onDone={this.handleOnLoadDone}/> }
        { loadingDialogOn && !affiliation && this.renderPlaceHolder()}
        <div><span className="bold">Gene</span> { searchSession.geneName }</div>
        <Dimmer.Dimmable dimmed={disabled}>
          <Dimmer active={disabled} inverted />
          <Table className="mt1" disabled={disabled} />
        </Dimmer.Dimmable>
      </div>
    );
  }

  renderGeneSearchTerms() {
    const searchSession = this.getSearchSession();
    const searched = (searchSession.searchInput.searched || []).join(', ');
    return (
      <div className="flex-auto mr2">
        <div className="bold mb1">Search Terms</div> <ReadMore lines={1}>{searched}</ReadMore>
      </div>
    );
  }

  renderCaSearchTerms() {
    const searchSession = this.getSearchSession();
    const searchedItems = searchSession.searchInput.searched || [];
    const cutOffLimit = 50;
    const size = _.size(searchedItems);
    const searched = _.slice(searchedItems, 0, cutOffLimit).join(', ');
    const diff = size - cutOffLimit;
    const shouldCutOff = diff > 0;
    const areOrIs = diff === 1? 'is' : 'are';
    const termsOrTerm = diff === 1? 'term' : 'terms';

    return (
      <div className="flex-auto">
        <div className="bold mb1">Search Terms</div> <ReadMore lines={1}>{searched} {shouldCutOff && `( note: there ${areOrIs} ${diff} ${termsOrTerm} not shown here )`}</ReadMore>
      </div>
    );
  }

  renderHgvsSearchTerms() {
  }

  renderPlaceHolder() {
    return (
      <Segment placeholder>
        <Header icon color="grey"><Icon color="grey" name="lock" />
          This feature is available once you login as an affiliation
        </Header>
        <Segment.Inline className="mt2">
          <Button onClick={this.handleHideSaveLoadDialog}>Cancel</Button>
        </Segment.Inline>
      </Segment>
    );
  }
}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(Prioritize, {
  savingDialogOn: observable,
  loadingDialogOn: observable,
  handleHideSaveLoadDialog: action,
  handleOnLoadDone: action,
  handleCancel: action,
  showSaveDialog: action,
  showLoadDialog: action,
});

const mapStateToProps = state => ({ auth: state.auth });

export default connect(mapStateToProps)(inject('searchWizard', 'searchSession')(withRouter(observer(Prioritize))));