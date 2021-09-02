// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { configure } from 'mobx';
import { Provider } from 'mobx-react';
// import { setLivelynessChecking } from 'mobx-state-tree';

// import * as serviceWorker from '../serviceWorker';

import 'typeface-lato';
import '../components/vpt/css/basscss-important.scss';
import '../components/vpt/css/animate.css';
import 'react-table-6/react-table.css';
import '../components/vpt/css/index.scss';
import 'toastr/build/toastr.css';

import { Message, Icon, Container } from 'semantic-ui-react';

import { initializeGlobals } from '../components/vpt/globals';
import Vpt from '../components/vpt/VptApp';

// Disabling service worker
// serviceWorker.unregister();

// Enable mobx strict mode, changes to state must be contained in actions
configure({ enforceActions: 'always' });
// setLivelynessChecking('error');

const models = initializeGlobals();

// Render the main App
function renderVpt() {
  return (
    <Provider {...models}>
      <div id="vpt">
        <Vpt />
      </div>
    </Provider>
  );
}

// Render a progress message
function renderProgress() {
  return (
    <Container text className="pt4" id="vpt">
      <Message icon>
        <Icon name="circle notched" loading />
        <Message.Content>
          <Message.Header>Just one second</Message.Header>
          Great things are now happening, please wait!
        </Message.Content>
      </Message>
    </Container>
  );
}

// Render an error message
function renderError(err) {
  const error = _.get(err, 'message', 'Unknown error');
  return (
    <Container text className="pt4" id="vpt">
      <Message negative>
        <Message.Header>We have a problem</Message.Header>
        <p>{error}</p>
        <p>See if refreshing the browser will resolve your issue</p>
      </Message>
    </Container>
  );
}

// renderProgress();

// Trigger the app startup sequence
class VariantPrioritizationTool extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      initialized: false,
    }
  }

  componentDidMount() {
    renderProgress();
    this.initialize();
  }

  initialize() {
    (async () => {
      try {
        await models.app.start();
        this.setState({ initialized: true })
        // renderVpt();
      } catch (err) {
        console.log(err);
        // TODO - check if the code = tokenExpired, then
        // - render a notification error
        // - call cleaner cleanup, this is IMPORTANT
        // - render the app and skip the rest of the renderError logic
        // renderError(err);
        this.setState({ initialized: false })
        try {
          models.cleaner.cleanup();
        } catch (error) {
          // ignore
          console.log(error);
        }
      }
    })();
  }

  render() {
    return this.state.initialized ? renderVpt() : renderError();
  }
}

export default VariantPrioritizationTool;
