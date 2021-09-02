// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import React from 'react';
import { connect } from 'react-redux';
import { action, decorate } from 'mobx';
import { inject, observer } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { Icon, Header, Divider, Dropdown } from 'semantic-ui-react';

import { createLink } from '../helpers/routing';
import logo from '../images/logo.png';

// expected props
// - app (via injection)
// - userStore (via injection)
// - authentication (via injection)
class MainLayout extends React.Component {

  goto = (pathname) => () => {
    const location = this.props.location;
    const link = createLink({ location, pathname });

    this.props.history.push(link);
  }

  render() {

    return (
      <div>
        <div className="flex ml3 mr3 mt2">
          <div><img src={logo} alt="ClinGen Logo" style={{ width: '80px', height: '60'}}/></div>
          <Header className="ml2 mt2 flex-auto" as="h3" color="blue">Variant Prioritization
            <Header.Subheader><a href="/" target="_blank" rel="noopener noreferrer">Learn more about this tool</a> <Icon name="external" size="small" /></Header.Subheader>
          </Header>
          <div>
            { this.renderUserDropdown() }
          </div>  
        </div>
        <Divider className="mb0 mt0"/>
        { this.props.children }
        <div style={{ height: '100px' }}></div>
      </div>);
  }

  renderUserDropdown() {
    const { auth } = this.props;
    const isAdmin = auth && auth.groups && auth.groups.length
      ? auth.groups[0] === 'admin'
      : null;

    return (
      <div className="mt1">
        { isAdmin && <Icon name="user" color="red"/> }
        { !isAdmin && <Icon name="user"/> }
        <Dropdown direction="left">
          <Dropdown.Menu>
            <Dropdown.Item icon="list alternate outline" text="My Exports" onClick={this.goto('/vp/exports')} />
            <Dropdown.Item icon="search" disabled text="My Saves Searches" onClick={this.goto('/vp/saves')} />
          </Dropdown.Menu>
        </Dropdown>
      </div>
    );
  }

}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(MainLayout, {
  handleLogin: action,
  handleLogout: action,
  handleChangeAffiliation: action,
});

const mapStateToProps = (state) => ({
  auth: state.auth
});

export default connect(mapStateToProps)(inject('app')(withRouter(observer(MainLayout))));