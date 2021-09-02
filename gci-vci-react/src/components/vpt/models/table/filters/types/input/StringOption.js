// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import { types } from 'mobx-state-tree';

import { globals } from '../../../../../globals';

// ==================================================================
// StringOption
// ==================================================================
const StringOption = types.model('StringOption', {
  type: 'StringOption',
  id: '', // special case for 'exists', 'doesNotExist'
  value: '',
  selected: false,
  accessorPaths: types.optional(types.array(types.string), []),
})

.volatile(self => ({
  filterModel: undefined,
  template: undefined, // IMPORTANT: "template" here is the input model template, NOT the filter model template.
}))

.actions(self => ({
  setSelected(flag) {
    self.selected = flag;
  },
  normalizeInput() {
    // we don't need to do any normalization for the string option
  },
  attachFilterModel(filterModel) {
    self.filterModel = filterModel;
  },
  attachTemplate(template) {
    self.template = template;
  },
}))

.views(self => ({
  get disabled() {
    if (self.template && _.isFunction(self.template.disabled)) return self.template.disabled({ filterModel: self.filterModel, inputModel: self, globals });
    if (self.template && !_.isUndefined(self.template.disabled)) return self.template.disabled;
    return false;
  },

  pass(item) {
    if (!self.selected) return false;
    if (self.template && self.template.pass) {
      return self.template.pass({ item, filterModel: self.filterModel, inputModel: self, globals })
    };
    const value = _.get(item, self.accessorPaths);
    const id = self.id;
    if (id === 'exists') return value !== undefined;
    if (id === 'doesNotExist') return value === undefined;
    return value === self.value;
  },

  get title() {
    const title = self.template.title;
    if (_.isFunction(title)) return title({ globals });
    return title;
  },

}));

export { StringOption };