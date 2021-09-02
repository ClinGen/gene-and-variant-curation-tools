// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import { types, getEnv, applySnapshot } from 'mobx-state-tree';

import { InputGroup } from './input/InputGroup';

// ==================================================================
// InputGroupsFilterModel
// ==================================================================
const InputGroupsFilterModel = types.model('InputGroupsFilterModel', {
  type: 'InputGroupsFilterModel',
  templateId: '',
  idPrefix: '',
  localTitle: types.maybe(types.string), // overridden title
  enabled: true,
  inputGroups: types.optional(types.array(InputGroup), []),
})

.actions(self => ({
  afterCreate() {
    if (!self.idPrefix) {
      self.idPrefix = `r-${Date.now()}-${_.padStart(_.random(0, 9999), 4, '0')}`;
    }
  },
  afterAttach() {
    const template = self.template;
    if (self.inputGroups.length === 0) {
      applySnapshot(self.inputGroups, template.inputGroups);
    }
    _.forEach(self.inputGroups, (group, index) => {
      group.attachFilterModel(self);
      group.attachTemplate(template.inputGroups[index]);
    });

  },
  setTitle(title) {
    const templateTitle = self.template.title;
    if (title === templateTitle) self.localTitle = undefined;
    else self.localTitle = title;
  },
  setEnabled(enabled) {
    self.enabled = enabled;
  },
  setInputGroups(inputGroups) {
    const template = self.template;
    applySnapshot(self.inputGroups, inputGroups);
    _.forEach(self.inputGroups, (group, index) => {
      group.attachFilterModel(self);
      group.attachTemplate(template.inputGroups[index]);
    });
  }
}))

.views(self => ({
  pass(item) {
    if (!self.enabled) return true;
    return _.every(self.inputGroups, (group) => group.pass(item));
  },
  get filterId() {
    return `${self.templateId}___${self.idPrefix}`;
  },
  get template() {
    const registry = getEnv(self).filtersRegistry;
    return registry.templates[self.templateId];
  },
  get title() {
    // if we have a title then return it, otherwise return the template.title
    if (self.localTitle !== undefined) return self.localTitle;
    return self.template.title;
  },
  get description() {
    return self.template.description;
  },
  get editor() {
    const template = self.template;
    if (!template.editor) return () => null; // return a null react component
    return template.editor({ model: self }); // model is the filterModel
  }
}));

export { InputGroupsFilterModel };
