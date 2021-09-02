// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import { types, getEnv, getSnapshot } from 'mobx-state-tree';

import { FourState } from '../base';
import { postExportOperation } from '../../helpers/api';
import { boom } from '../../helpers/errors';
import { ExportOperationStore } from './ExportOperationStore';
import { ExportOperation } from './ExportOperation';


// ==================================================================
// ExportOperationsStore
// ==================================================================
const ExportOperationsStore = FourState
  .named('ExportOperationsStore')
  .props({
    tickPeriod: 15 * 1000, // 15 seconds
    exportOperations: types.optional(types.map(ExportOperation), {}),
    stores: types.optional(types.map(ExportOperationStore), {}),
    affiliation: '',
  })

  .actions(self => {
    // save the base implementation of clear
    const superClear = self.clear;

    return {
      doLoad: async function({ affiliation } = {}) {
        if (affiliation) self.affiliation = affiliation;
        
        // const exportOperations = await getExportOperations(self.affiliation) || [];
        self.runInAction(() => {
          // const previousKeys = {};
          // self.exportOperations.forEach((value, key) => {
          //   previousKeys[key] = true;
          // });
          // exportOperations.forEach((operation) => {
          //   const id = operation.id;
          //   const hasPrevious = self.exportOperations.has(id);

          //   self.addExportOperation(operation);

          //   if (hasPrevious) {
          //     delete previousKeys[id];
          //   }
          // });

          // we no longer can simply delete the ones that are not returned by the server, this is because
          // we might be searching by an affiliation
          // _.forEach(previousKeys, (value, key) => {
          //   self.exportOperations.delete(key);
          // });
        });
      },

      addExportOperation(rawExportOperation) {
        const id = rawExportOperation.id;
        const previous = self.exportOperations.get(id);
        if (!previous) {
          self.exportOperations.put(rawExportOperation);
        } else {
          previous.setSummary(rawExportOperation);
        }
      },

      getExportOperationStore: (id) => {
        let entry = self.stores.get(id);
        if (!entry) {
          self.stores.set(id, ExportOperationStore.create({ id }));
          entry = self.stores.get(id);
        }

        return entry;
      },
  
      submitRequest: async function({ variants = [], geneName, filters }) {
        const filtersSnapshot = getSnapshot(filters);
        // const user = getEnv(self).userStore.user;
        // const auth = getEnv(self).authentication;
        // const affiliationId = user.selectedAffiliationId;
        // auth.clearExpiredTokens();
        // const auth0AccessToken = auth.getAuth0AccessTokenFromLocalStorage();
        // if (!auth0AccessToken) throw boom.tokenExpired('Your session expired', true);

        const payload = {
          // auth0AccessToken: auth.getAuth0AccessTokenFromLocalStorage(),
          geneName,
          filters: filtersSnapshot,
          data: _.map(variants, (variant) => {
            const item = {
              caid: variant.caid,
              grch38HGVS: variant.grch38HGVS,
              grch37HGVS: variant.grch37HGVS  
            };
            const clinvarVariantId = _.get(variant, 'clinvar.id');
            const clinvarVariantTitle = _.get(variant, 'clinvar.title');
            if (clinvarVariantId) item.clinvarVariantId = clinvarVariantId;
            if (clinvarVariantTitle) item.clinvarVariantTitle = clinvarVariantTitle;

            return item;
          }),
        };

        console.log(payload);

        // if (affiliationId && affiliationId !== 'SELF') {
        //   payload.affiliation = affiliationId;
        // }

        // const operation = await postExportOperation(payload);
        // const store = self.getExportOperationStore(operation.id);
        // await store.load();
        // return store;
      },

      resubmitRequest: async function({ requestId }) {
        const auth = getEnv(self).authentication;
        auth.clearExpiredTokens();
        const auth0AccessToken = auth.getAuth0AccessTokenFromLocalStorage();
        if (!auth0AccessToken) throw boom.tokenExpired('Your session expired', true);

        const payload = {
          auth0AccessToken: auth.getAuth0AccessTokenFromLocalStorage(),
          requestId,
        };

        const operation = await postExportOperation(payload);
        self.addExportOperation(operation);
        const store = self.getExportOperationStore(operation.id);
        await store.load();
        return store;
      },
    
      clear: () => {
        self.stores.clear();
        self.exportOperations.clear();
        superClear();
      }
    };
  })

  .views(self => ({

    getListByAffiliation(affiliation) {
      return _.filter(self.list, (item) => {
        if (!affiliation || affiliation === 'SELF') return _.isEmpty(item.affiliation);
        return (item.affiliation || []).includes(affiliation);
      });
    },

    get empty() {
      return self.exportOperations.size === 0;
    },

    get list() {
      const result = [];
      self.exportOperations.forEach((operation) => result.push(operation));

      return _.reverse(_.sortBy(result, ['date_created']));
    },
  
  }));


function register(globals) {
  globals.exportOperationsStore = ExportOperationsStore.create({}, globals);
}

export { ExportOperationsStore, register };
