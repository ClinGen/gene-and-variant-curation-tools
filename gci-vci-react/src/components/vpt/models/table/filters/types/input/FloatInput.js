// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import { types } from 'mobx-state-tree';

const viewNames= ['lessThan', 'lessThanEqual', 'greaterThan', 'greaterThanEqual', 'equalTo', 'notEqualTo'];

// ==================================================================
// FloatInputView
// ==================================================================
const FloatInputView = types.model('FloatInputView', {
  type: 'FloatInputView',
  id: types.enumeration(viewNames),
  title: '',
  selected: false,
  value: types.maybe(types.union(types.number, types.string)),
})

.actions(self => ({
  setSelected(flag) {
    self.selected = flag;
  },
  setValue(value) {
    self.value = value;
  },
  normalizeInput() {
    const value = parseFloat(self.value);
    if (_.isNaN(value)) self.value = 0.0;
    else self.value = value;
  }
}))

.views(self => ({
  pass(value) {
    if (!self.selected) return false;
    const id = self.id;
    if (id === 'lessThan') return value < self.value;
    else if (id === 'lessThanEqual') return value <= self.value;
    else if (id === 'greaterThan') return value > self.value;
    else if (id === 'greaterThanEqual') return value >= self.value;
    else if (id === 'equalTo') return value === self.value;
    else if (id === 'notEqualTo') return value !== self.value;

    return false;
  }
}));

// ==================================================================
// FloatInputRangeView
// ==================================================================
const FloatInputRangeView = types.model('FloatInputRangeView', {
  type: 'FloatInputRangeView',
  id: 'between',
  title: '',
  selected: false,
  from: types.maybe(types.union(types.number, types.string)),
  to: types.maybe(types.union(types.number, types.string)),
})

.actions(self => ({
  setSelected(flag) {
    self.selected = flag;
  },
  setTo(value) {
    self.to = value;
  },
  setFrom(value) {
    self.from = value;
  },
  normalizeInput() {
    const from = parseFloat(self.from);
    if (_.isNaN(from)) self.from = 0.0;
    else self.from = from;

    const to = parseFloat(self.to);
    if (_.isNaN(to)) self.to = 0.0;
    else self.to = to;
  }
}))

.views(self => ({
  pass(value) {
    if (!self.selected) return false;
    return value >= self.from && value <= self.to;
  }
}));

// ==================================================================
// Misc.
// ==================================================================
const viewTypes = {
  'FloatInputView': FloatInputView,
  'FloatInputRangeView': FloatInputRangeView,
};

// type dispatcher to use with types.union, we basically need to return
// the correct input view type given a snapshot of the input view type instance
const viewTypeDispatcher = (snapshot) => {
  const type = snapshot.type;
  return viewTypes[type];
};

// ==================================================================
// FloatInput
// ==================================================================
const FloatInput = types.model('FloatInput', {
  type: 'FloatInput',
  id: '',
  title: '',
  selected: false,
  accessorPaths: types.optional(types.array(types.string), []),
  views: types.optional(types.array(types.union({ dispatcher: viewTypeDispatcher }, ..._.values(viewTypes))), [
   { type:'FloatInputView', id: 'lessThan', title: 'less than', selected: true, value: 0.0 },
   { type:'FloatInputView', id: 'lessThanEqual', title: 'less than or equal', value: 0.0 },
   { type:'FloatInputView', id: 'greaterThan', title: 'greater than', value: 0.0 },
   { type:'FloatInputView', id: 'greaterThanEqual', title: 'greater than or equal', value: 0.0 },
   { type:'FloatInputView', id: 'equalTo', title: 'equal to', value: 0.0 },
   { type:'FloatInputView', id: 'notEqualTo', title: 'not equal to', value: 0.0 },
   { type:'FloatInputRangeView', id: 'between', title: 'between', from: 0.0, to: 0.0 },
  ]),
})

.volatile(self => ({
  filterModel: undefined,
  template: undefined, // IMPORTANT: "template" here is the input model template, NOT the filter model template.  
}))

.actions(self => ({
  setSelected(flag) {
    self.selected = flag;
  },

  selectViewById(id) {
    _.forEach(self.views, (view) => {
      view.setSelected(false);
    });
    const view = self.getViewById(id);
    view.setSelected(true);
  },

  normalizeInput() {
    _.forEach(self.views, (view) => {
      if (_.isFunction(view.normalizeInput)) {
        view.normalizeInput();
      }
    });
  },

  attachFilterModel(filterModel) {
    self.filterModel = filterModel;
  },

  attachTemplate(template) {
    self.template = template;
  },
}))

.views(self => ({
  pass(item) {
    if (!self.selected) return false;
    const value = _.get(item, self.accessorPaths);
    const view = self.selectedView;
    if (!view) return false;
    return view.pass(value);
  },

  getViewById(id) {
    return  _.find(self.views, (view) => view.id === id);
  },
  get selectedView() {
    return _.find(self.views, (view) => view.selected);
  }
}));

export { FloatInput };