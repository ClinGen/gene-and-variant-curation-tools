// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import React from 'react';
import { withRouter } from 'react-router-dom';
import { decorate, action } from 'mobx';
import { observer, inject } from 'mobx-react';
import { Divider, Header, Button } from 'semantic-ui-react';

import { createLink } from '../../../helpers/routing';
import GeneInput from './GeneInput';
import CaInput from './CaInput';
import HgvsInput from './HgvsInput';

// expected props
// - searchWizard (via injection)
// - searchSession (via injection)
// - app (via injection)
class SearchInput extends React.Component {
 
  getWizard() {
    return this.props.searchWizard;
  }

  getSearchSession() {
    return this.props.searchSession;
  }

  componentDidMount() {
    window.scrollTo(0, 0);
    this.getWizard().setCurrentStep(1);
  }

  getApp() {
    return this.props.app;
  }

  // get authenticated() {
  //   return this.getApp().userAuthenticated;
  // }

  goto(pathname) {
    const location = this.props.location;
    const link = createLink({ location, pathname });

    this.props.history.push(link);
  }

  handleResultAvailable = (result, searchModel) => {
    const searchSession = this.getSearchSession();
    const sameInput = searchSession.searchInput && searchModel.isSame(searchSession.searchInput);
    searchSession.setSearchInput(searchModel.searchInput);
    searchSession.setSearchResult(result);
    if (!sameInput) {
      searchSession.selectionModel.clearSelection();
      console.log(`src/parts/search/step1/index.js --- different search terms detected, clearing the selection`);
    } else {
      console.log(`src/parts/search/step1/index.js --- same search terms detected, not clearing the selection`);
    }

    this.goto('/vp/search/prioritize');
  };

  render() {
    const { processing, geneSearch, caSearch, hgvsSearch } = this.getWizard();
    const isDisabled = (search) => !search.processing && processing; // if this type of search is not processing but another one is, then this one is disabled

    return (
      <div className="mt3 animated fadeIn">
          <div className="mt4"></div>
          <div className="flex">
            <Header textAlign="left" className="mt1 mr2" as="h3" color="grey">Use A Saved Search</Header>
            <div><Button as="a" color="blue" size="tiny" onClick={() => this.goto('/vp/saves')}>View My Saved Searches</Button></div>
          </div>
          <div>{ !processing? <Divider className="mt3 mb4" horizontal>Or</Divider> : <div className="mt3 mb4 fs-9">&nbsp;</div> }</div>
          <GeneInput disabled={isDisabled(geneSearch)} search={geneSearch} onResultAvailable={this.handleResultAvailable}/>
          {/* { !processing? <Divider className="mt4 mb4" horizontal>Or</Divider> : <div className="mt4 mb4 fs-9">&nbsp;</div> }
          <CaInput disabled={isDisabled(caSearch)} search={caSearch} onResultAvailable={this.handleResultAvailable}/>
          { !processing? <Divider className="mt4 mb4" horizontal>Or</Divider> : <div className="mt4 mb4 fs-9">&nbsp;</div> }
          <HgvsInput disabled={isDisabled(hgvsSearch)} search={hgvsSearch} onResultAvailable={this.handleResultAvailable}/> */}
      </div>
    );
  }

}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(SearchInput, {
  handleResultAvailable: action,
  // authenticated: computed,
});

export default inject('app', 'searchWizard', 'searchSession')(withRouter(observer(SearchInput)));