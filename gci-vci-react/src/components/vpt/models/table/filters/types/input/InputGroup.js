// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import { types, getSnapshot } from 'mobx-state-tree';

import { StringOption } from './StringOption';
import { FloatInput } from './FloatInput';

const childrenTypes = {
  'StringOption': StringOption,
  'FloatInput': FloatInput,
};

// type dispatcher to use with types.union
const typeDispatcher = (snapshot) => {
  const type = snapshot.type;
  return childrenTypes[type];
};

// ==================================================================
// InputGroup
// ==================================================================
const InputGroup = types.model('InputGroup', {
  type: 'InputGroup',
  groupType: types.enumeration(['oneOf', 'or', 'and']),
  id: '',
  title: '',
  value: '',
  selected: false,
  filterFnId: '', // the id of the filter fn (optional)
  display: types.enumeration(['hidden', 'label', 'input']),
  children: types.late(() => types.optional(types.array(types.union({
    dispatcher: (snapshot) => {
      if (snapshot.type === 'InputGroup') return InputGroup;
      return typeDispatcher(snapshot);
    }
  }, InputGroup, ..._.values(childrenTypes))), [])),
})

.volatile(self => ({
  filterModel: undefined,
  template: undefined, // IMPORTANT: "template" here is the input model template, NOT the filter model template.
}))

.actions(self => ({
  setSelected(flag) {
    self.selected = flag;
  },
  selectChildById(id) {
    // depending on the group type, the logic differs slightly
    const groupType = self.groupType;
    if (groupType === 'oneOf') {
      _.forEach(self.children, (child) => {
        child.setSelected(false);
      });
    }
    const child = self.getChildById(id);
    child.setSelected(true);
  },
  unselectChildById(id) {
    // depending on the group type, the logic differs slightly
    const groupType = self.groupType;
    if (groupType === 'oneOf') return; // we basically, can't unselect, we can only select and the others will be unselected
    const child = self.getChildById(id);
    child.setSelected(false);
  },
  normalizeInput() {
    // we ask each children to normalize its input
    _.forEach(self.children, (child) => {
      if (_.isFunction(child.normalizeInput)) {
        child.normalizeInput();
      }
    });
  },

  attachFilterModel(filterModel) {
    self.filterModel = filterModel;
    _.forEach(self.children, (child) => {
      if (_.isFunction(child.attachFilterModel)) {
        child.attachFilterModel(filterModel);
      }
    });
  },

  attachTemplate(template) {
    self.template = template;
    _.forEach(self.children, (child, index) => {
      const childTemplate = template.children[index];
      if (_.isFunction(child.attachTemplate)) {
        child.attachTemplate(childTemplate);
      }
    });
  }

}))

.views(self => ({
  pass(item) {
    if (!self.selected) return false;
    const groupType = self.groupType;
    const selectedChildren = self.selectedChildren;
    if (selectedChildren.length === 0) return false;
    // const values = _.map(self.selectedChildren, (child) => child.value);
    if (groupType === 'oneOf') return _.first(selectedChildren).pass(item);
    if (groupType === 'or') return _.some(selectedChildren, (child) => child.pass(item));
    if (groupType === 'and') return _.every(selectedChildren, (child) => child.pass(item));
  },

  getChildById(id) {
    return _.find(self.children, (child) => child.id === id);
  },

  get selectedChildren() {
    return _.filter(self.children, (child) => child.selected);
  },

  // IMPORTANT: even though a new completely separate copy is created, the volatile members (filterModel and template) instance
  // are still shared.
  makeCopy(env) { // env is optional, but it is the environment context objects, such as filtersRegistry. At this point it is not needed
    const group = InputGroup.create(getSnapshot(self), env);
    group.attachFilterModel(self.filterModel);
    group.attachTemplate(self.template);
    return group;
  },

  get layout() {
    if (self.template && self.template.layout) return self.template.layout;
    return {
      type: 'table',
      columns: 3,
    };
  }

  // get title() {
  //   if (self.template) return self.template.title;
  //   return 'N/A';
  // }
}));

export { InputGroup };