import React from 'react';
import { API_NAME } from './utils';
import Amplify from 'aws-amplify';
import awsconfig from './config';
import throttle from 'lodash.throttle';
import AuthNav from './components/header/AuthNav';
import Alert from './components/common/Alert';

//import background from './style/img/test-bg.svg';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import AppRouter from './routes/router';
import ClinGenReducer from './reducers/index';
import { loadState, saveState } from './actions/localStorage';
import { isProdSite } from './utilities/siteUtilities';

Amplify.configure({
  Auth: {
    region: awsconfig.cognito.REGION,
    userPoolId: awsconfig.cognito.USER_POOL_ID,
    identityPoolId: awsconfig.cognito.IDENTITY_POOL_ID,
    userPoolWebClientId: awsconfig.cognito.APP_CLIENT_ID
  },
  API: {
    endpoints: [
      {
        name: API_NAME,
        endpoint: awsconfig.apiGateway.URL,
        region: awsconfig.apiGateway.REGION
      }
    ]
  }
});

//Global State
const persistedState = loadState();
export const store = createStore(
  ClinGenReducer,
  persistedState,
  // remove or comment out after development
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
);
//Persist state in localstorage so it's not lost on refresh/re-render
store.subscribe(throttle(() => {
  saveState({
    auth: store.getState().auth,
    variant: store.getState().variant,
    interpretation: store.getState().interpretation,
    gdm: store.getState().gdm,
    annotations: store.getState().annotations,
    curatedEvidences: store.getState().curatedEvidences
  });
}, 1000));

function App() {
  return (
    <div className="App">
      <Provider store={store}>
        <Router>
          {!isProdSite()
            ? <Alert
                name="non-prod-banner"
                className="mb-0"
                type="danger"
                value={`<strong>Note:</strong> This is a demo version of the site. Data entered will be deleted periodically, the next deletion is scheduled for September 15, 2021.`} />
            : null
          }
          <AuthNav />
          <AppRouter />
        </Router>
      </Provider>
    </div>
  );
}

export default App;