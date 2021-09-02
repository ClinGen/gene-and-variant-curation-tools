// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import { decorate, action, observable, runInAction, computed } from "mobx";

// This is the file where we keep states that are kept local to the current browser window
// Examples of such states:
// - whether the column detail is shown or not
// - did we just apply the columns changes, etc.

class LocalColumnStates {
  constructor() {
    runInAction(() => {
      this.internalMap = {};
    });
  }

  get(id) {
    let state = this.internalMap[id];
    if (!state) {
      state = observable({});
      this.internalMap[id] = state;
    }

    return state;
  }

  clear() {
    this.internalMap = {};
  }
}

decorate(LocalColumnStates, {
  changesApplied: observable,
  internalMap: observable,
  get: action,
  clear: action,
});


class LocalFilterStates {
  constructor() {
    runInAction(() => {
      this.internalMap = {};
    });
  }

  get(id) {
    let state = this.internalMap[id];
    if (!state) {
      state = observable({});
      this.internalMap[id] = state;
    }

    return state;
  }

  clear() {
    this.internalMap = {};
  }
}

decorate(LocalFilterStates, {
  internalMap: observable,
  get: action,
  clear: action,
});

class SaveDialogInput {
  constructor() {
    runInAction(() => {
      this.title = '';
      this.description = '';
      this.includeFilters = true;
      this.includeColumns = true;
      this.includeSearch = true;
      this.includeSelection = true;
      this.changed = false;
    });
  }

  get hasIncludes() {
    return this.includeFilters || this.includeColumns || this.includeSearch || this.includeSelection;
  }

  get includes() {
    const result = [];
    const add = (key) => result.push(key);

    if (this.includeFilters) add('filters');
    if (this.includeColumns) add('columns');
    if (this.includeSearch) add('search');
    if (this.includeSelection) add('selection');

    return result;
  }
}

decorate(SaveDialogInput, {
  title: observable,
  description: observable,
  includeFilters: observable,
  includeColumns: observable,
  includeSearch: observable,
  includeSelection: observable,
  changed: observable,
  hasIncludes: computed,
  includes: computed,
});

class LoadDialogInput {
  constructor() {
    runInAction(() => {
      this.includeFilters = false;
      this.includeColumns = false;
      this.includeSearch = false;
      this.includeSelection = false;
    });
  }

  reset() {
    this.includeFilters = false;
    this.includeColumns = false;
    this.includeSearch = false;
    this.includeSelection = false;
  }

  use(includes = []) {
    this.reset();
    const map = {};
    _.forEach(includes, (key) => {
      map[key] = true;
    });

    if (map['filters']) this.includeFilters = true;
    if (map['columns']) this.includeColumns = true;
    if (map['search']) this.includeSearch = true;
    if (map['selection']) this.includeSelection = true;
  }

  get hasIncludes() {
    return this.includeFilters || this.includeColumns || this.includeSearch || this.includeSelection;
  }

  get includes() {
    const result = [];
    const add = (key) => result.push(key);

    if (this.includeFilters) add('filters');
    if (this.includeColumns) add('columns');
    if (this.includeSearch) add('search');
    if (this.includeSelection) add('selection');

    return result;
  }
}

decorate(LoadDialogInput, {
  includeFilters: observable,
  includeColumns: observable,
  includeSearch: observable,
  includeSelection: observable,
  hasIncludes: computed,
  includes: computed,
  reset: action,
  use: action,
});

const localColumnStates = new LocalColumnStates();
const localFilterStates = new LocalFilterStates();
const saveDialogInput = new SaveDialogInput();
const loadDialogInput = new LoadDialogInput();

export { localColumnStates, localFilterStates, saveDialogInput, loadDialogInput };
