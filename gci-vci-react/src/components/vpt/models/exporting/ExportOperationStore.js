// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import { getParent } from 'mobx-state-tree';

import { FourState } from '../base';
import { isTokenExpired, isForbidden } from '../../helpers/errors';
import { displayError } from '../../helpers/notification';

// ==================================================================
// ExportOperationStore
// ==================================================================
const ExportOperationStore = FourState
  .named('ExportOperationStore')
  .props({
    id: '',
    tickPeriod: 10 * 1000, // 10 seconds
  })

  .actions(self => {
    // save the base implementation of clear
    const superClear = self.clear;

    return {
      doLoad: async function() {
        const parent = getParent(self, 2);
        try {
          // const latest = await getExportOperation(self.id);
          const latest = {
            id: self.id,
            status: 'pending',
            affiliation: '10007',
            geneName: 'PAH',
            email: 'hztong@stanford.edu',
            firstName: 'Howard',
            lastName: 'Tong',
            title: 'Test Title',
            errorMessage: '',
          };
          const status = latest.status;
  
          parent.addExportOperation(latest);

          const exportOperation = parent.exportOperations.get(self.id); // to ensure we get the latest and merged version
          // const payload = await getExportOperationPayload(self.id);
          const payload = {
            "affiliation": "10007", // if applicable
            "geneName": "PAH",
            "email": 'hztong@stanford.edu',
            "data": [{
              "item": {
                "caid": "CA6748843",
                "grch38HGVS": "NC_000012.12:g.102852885G>A",
                "grch37HGVS": "NC_000012.11:g.103246663G>A",
                // "clinvarVariantId": "xxxxxxx", // if available
                "clinvarVariantTitle": "NM_000277.3(PAH):c.772C>T (p.Leu258=)", // if available
              },
              "status": "pending",
              "title": "Test Payload"
            }]
          };
          exportOperation.setPayload(payload);
  
          if (status !== 'not_started' && status !== 'in_progress') {
            self.stopHeartbeat();
          } else {
            self.startHeartbeat();
          }  
        } catch(error) {
          self.stopHeartbeat();
          if (isTokenExpired(error) || isForbidden(error)) {
            // const auth = getEnv(self).authentication;
            // const app = getEnv(self).app;
            // auth.clearTokens();
            // app.setUserAuthenticated(false);
            displayError('Your session has expired, please login again.');
          }
          throw error;
        }
      },

      clear: () => {
        superClear();
      }
    };
  })

  .views(self => ({

    get empty() {
      return _.isEmpty(self.exportOperation);
    },

    get exportOperation() {
      const parent = getParent(self, 2);
      const operation = parent.exportOperations.get(self.id);

      return operation;
    },
  
  }));


// Note: Do NOT register this in the global context, if you want to gain access to an instance
//       use ExportOperationsStore.getExportOperationStore()
export { ExportOperationStore };