// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

// import _ from 'lodash';
import { getEnv } from 'mobx-state-tree';

// import { setIdToken } from '../helpers/api';
// import { isNotFound } from '..//helpers/errors';
import { FourState } from './base';
// import { displayError } from '../helpers/notification';

const Startup = FourState
  .named('Startup')
  .actions(self => ({
    doLoad: async () => {
      // The logic:
      // - ask the authentication model to clear any expired tokens
      // - ask the authentication model for the id token
      //   - if not found, it is either expired or does not exists, in both cases, we will consider this a clean start
      //   - if found,
      //      - set the token on the api object
      //      - ask the userStore to load the user
      //      - if we get an error, we need to examine it
      //        - if the error is about the user not being found, then then it could mean that the user has not been
      //          fully added to the VCI database, or that the sync is not done yet, or the user has been deactivated
      //          in all these cases, we need to display a dialog explaining the problem, this is done later when the app is rendered
      //        - if the error is not about the user not being found, then display the error as a toaster message and call the cleaner
      //      - if we don't get an error, then
      //        - get the selected affiliation id (from local storage, if it exists) and assign it to the user object,
      //          if the user has no affiliation ids, then select the affiliation id to be 'SELF'
      //        - get the avatar url (from local storage, if it exists) and assign it to the user object
      //        - if the selected affiliation id is empty, then a dialog asking the user to select one will be shown (this is done later when the app is rendered)
      //        - finally, setup any preferences store (TODO - future enhancement), then set app.setUserAuthenticated(true);
      //        - and we are done! yay!

      // const cleaner = getEnv(self).cleaner;
      // const userStore = getEnv(self).userStore;
      // const app = getEnv(self).app;
      // const auth = getEnv(self).authentication;

      // auth.clearExpiredTokens();
      // const idToken = auth.getIdTokenFromLocalStorage();
      // if (!idToken) {
      //   // either the token expired or this is clean start
      //   cleaner.cleanup();
      //   return;
      // }

      // setIdToken(idToken);
      // try {
      //   await userStore.load();
      // } catch(error) {
      //   if (isNotFound(error)) {
      //     app.setShowPartialRegistrationDialog(true);
      //   } else {
      //     displayError('Encountered a problem trying to get the user information of the logged in user', error);
      //   }
      //   cleaner.cleanup();
      //   return;
      // }

      self.runInAction(() => {
        // const user = userStore.user;
        // const selectedAffiliationId = auth.getSelectedAffiliationFromLocalStorage();
        // const userAvatar = auth.getUserAvatarFromLocalStorage();
        // const size = _.size(user.affiliation);

        // user.setSelectedAffiliationId(selectedAffiliationId);
        // if (!selectedAffiliationId && size === 0) {
        //   user.setSelectedAffiliationId('SELF');
        // } else if (!selectedAffiliationId && size > 0) {
        //   app.setShowAffiliationSelectionDialog(true);
        // }
        // user.setAvatar(userAvatar);
        // app.setUserAuthenticated(true);
      });
    },
  }));
  
// const Startup = FourState
//   .named('Startup')
//   .actions(self => ({
//     doLoad: async () => {
//       const cleaner = getEnv(self).cleaner;
//       const userStore = getEnv(self).userStore;
//       const preferencesStore = getEnv(self).preferencesStore;
//       const disposers = getEnv(self).disposers;
//       const app = getParent(self);
//       const now = Date.now();
//
//       await userStore.load();
//       await usersStore.load();
//       await preferencesStore.load();
//
//       const debouncePreferences =  _.debounce(async (snapshot) => {
//         if (!app.userAuthenticated) return; // do not call the server if the user logout
//         try {
//           await preferencesStore.save(snapshot);
//         } catch (err) {
//           // displayError('Calling the preferences api produced', err); lets just do a console error
//           console.log(err);
//         }
//       }, 300, { 'trailing': true });
//
//       disposers['preferencesSnapshotWatcher'] = onSnapshot(preferencesStore, debouncePreferences);
//       app.setUserAuthenticated(true);
//     },
//   }));

export { Startup };
