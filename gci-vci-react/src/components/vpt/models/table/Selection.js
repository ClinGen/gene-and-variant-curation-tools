// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import { types } from 'mobx-state-tree';

// ==================================================================
// SelectionModel
// ==================================================================
const SelectionModel = types.model('SelectionModel', {
  selection: types.optional(types.array(types.string), []),
})

.actions(self => ({
  setSelection(selection) {
    self.selection.replace(selection || []);
  },
  select(rowId) {
    const keyIndex = self.selection.indexOf(rowId);
    if (keyIndex < 0) self.selection.push(rowId);
  },
  unselect(rowId) {
    const keyIndex = self.selection.indexOf(rowId);
    if (keyIndex >= 0) self.selection.remove(rowId);
  },
  toggle(rowId) {
    if (self.isSelected(rowId)) self.unselect(rowId);
    else self.select(rowId);
  },
  clearSelection() {
    self.selection.clear();
  }
}))

.views(self => ({
  isSelected(rowId) {
    const id = rowId.includes('select') ? rowId : `select-${rowId}`;
    const keyIndex = self.selection.indexOf(id);
    return keyIndex >= 0;
  },
  get size() {
    return _.size(self.selection);
  },
}));

export { SelectionModel };
