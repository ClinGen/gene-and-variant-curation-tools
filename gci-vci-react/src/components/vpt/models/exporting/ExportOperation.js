// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import { types, applySnapshot } from 'mobx-state-tree';

import { affiliationIdToNameMap } from '../constants/affiliations';

// ==================================================================
// Stats
// ==================================================================
const Stats = types.model('Stats', {
  total: 0,
  completed: 0,
  pending: 0,
  skipped: 0,
  errored: 0,
});

// ==================================================================
// PayloadItemDetail
// ==================================================================
const PayloadItemDetail = types.model('PayloadItemDetail', {
  caid: '',
  grch38HGVS: '',
  grch37HGVS: '',
  clinvarVariantId: '',
  clinvarVariantTitle: '',
});

// ==================================================================
// PayloadItem
// ==================================================================
const PayloadItem = types.model('PayloadItem', {
  status: '',
  messages: types.optional(types.array(types.string), []),
  item: types.optional(PayloadItemDetail, {}),
  foundByCaid: false,
  variantCreated: false,
  variantId: '',
  interpretationCreated: false,
  interpretationId: '',
})
.views(self => ({
  get statusColor() {
    const status = self.status;
    if (status === 'completed') return 'teal';
    if (status === 'error') return 'red';
    if (status === 'pending') return 'orange';
    if (status === 'skipped') return 'brown';
    return 'grey';
  },

  get parsedMessages() {
    const result = [];
    const err = 'ERROR||||';
    const warn = 'WARN||||';
    const info = 'INFO||||';

    _.forEach(self.messages, (raw) => {
      if (_.startsWith(raw, err)) result.push({ level: 'error', message: raw.slice(err.length) });
      else if (_.startsWith(raw, warn)) result.push({ level: 'warn', message: raw.slice(warn.length) });
      else if (_.startsWith(raw, info)) result.push({ level: 'info', message: raw.slice(info.length) });
      else result.push({ level: 'info', message: raw });
    });

    return result;
  }
}));

// ==================================================================
// Payload
// ==================================================================
const Payload = types.model('Payload', {
  data: types.optional(types.array(PayloadItem), []),
  affiliation: '',
  geneName: '',
  email: '',
  firstName: '',
  lastName: '',
  title: '',
});

// ==================================================================
// ExportOperation
// ==================================================================
const ExportOperation = types.model('ExportOperation', {
  id: types.identifier,
  stats: types.optional(Stats, {}),
  date_created: '',
  expiresAt: '',
  last_modified: '',
  status: '',
  affiliation: '',
  geneName: '',
  email: '',
  firstName: '',
  lastName: '',
  title: '',
  payloadId: '',
  errorMessage: '',

  payload: types.optional(Payload, {}),
})

.actions(self => ({
  setSummary(w) {
    // we don't use applySnapshot() here because we don't want the payload to be erased if it exists,
    // this could happen if you load the summary without the payload
    self.stats = w.stats;
    self.date_created = w.date_created;
    self.expiresAt = w.expiresAt;
    self.last_modified = w.lastModified;
    self.status = w.status;
    self.affiliation = w.affiliation || '';
    self.geneName = w.geneName || '';
    self.email = w.email;
    self.firstName = w.firstName;
    self.lastName = w.lastName;
    self.title = w.title;
    self.payloadId = w.payloadId;
    self.errorMessage = w.errorMessage;

    if (w.payload) {
      applySnapshot(self.payload, w.payload);
    }
  },
  setPayload(payload) {
    applySnapshot(self.payload, payload);
  },
}))

.views(self => ({
  get success() {
    const status = self.status;
    const stats = self.stats || {};
    if (status === 'completed' && stats.errored === 0) return true;
    return false;
  },

  get affiliationName() {
    if (!self.affiliation) return '';
    const obj = affiliationIdToNameMap[self.affiliation];
    return obj? obj.affiliation_fullname : `Unknown (${self.affiliation})`;
  }
}));

export { ExportOperation };
