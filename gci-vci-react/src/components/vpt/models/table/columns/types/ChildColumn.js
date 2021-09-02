// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import { types, getEnv, getParent } from 'mobx-state-tree';

// ==================================================================
// ChildColumnModel
// ==================================================================
const ChildColumnModel = types.model('ChildColumnModel', {
  type: 'ChildColumnModel',
  id: '',
  localTitle: types.maybe(types.string), // overridden title
  enabled: true,
  headerColorId: types.maybe(types.string),
  bodyColorId: types.maybe(types.string),
})

.actions(self => ({
  afterCreate() {
    if (!self.idPrefix) {
      self.idPrefix = `r-${Date.now()}-${_.padStart(_.random(0, 9999), 4, '0')}`;
    }
  },
  afterAttach() {
    const template = self.template;
    if (!self.headerColorId && template.headerColorId) {
      self.headerColorId = template.headerColorId;
    }

    if (!self.bodyColorId && template.bodyColorId) {
      self.bodyColorId = template.bodyColorId;
    }
  },
  setTitle(title) {
    const templateTitle = self.template.title;
    if (title === templateTitle) self.localTitle = undefined;
    else self.localTitle = title;
  },
  setEnabled(enabled) {
    self.enabled = enabled;
  },
  setShowDetail(show) {
    self.showDetail = show;
  },
  setHeaderColorId(id) {
    self.headerColorId = id;
  },
  setBodyColorId(id) {
    self.bodyColorId = id;
  }
}))

.views(self => ({
  get columnId() {
    return `${self.template.id}___${self.idPrefix}`;
  },
  get parent() {
    return getParent(self, 2);
  },
  get labels() {
    return self.template.labels;
  },
  get template() {
    return _.find(self.parent.template.columns, (column) => column.id === self.id);
  },
  get headerColor() {
    const repo = getEnv(self).colorsRepo;
    const colorId = self.headerColorId || 'headerDefaults';
    return repo.colors[colorId];
  },
  get bodyColor() {
    const repo = getEnv(self).colorsRepo;
    const colorId = self.bodyColorId || 'headerDefaults';
    return repo.colors[colorId];
  },
  get title() {
    // if we have a title then return it, otherwise return the template.title
    if (self.localTitle !== undefined) return self.localTitle;
    return self.template.title;
  },
  get rtMeta() { // react-table column object
    // Logic
    // - construct the rtMeta by invoking it as a function passing the model (self)
    // - compute the correct header color and assign the headerStyle accordingly
    // - compute the correct body color and assign the style (cell) accordingly
    // - if Cell is provided, then use it instead of the cellRenderer,
    //   otherwise use the cellRenderer if one is provided
    // - use the column id
  
    const template = self.template;
    const rtMeta = _.isFunction(template.rtMeta)? template.rtMeta({ model: self}) : template.rtMeta;

    // header color
    const headerColor = self.headerColor;
    let headerStyle = rtMeta.headerStyle || {};
    headerStyle = { ...headerStyle, backgroundColor: headerColor.bg, color: headerColor.txt };
    rtMeta.headerStyle = headerStyle;

    // cell color
    const bodyColor = self.bodyColor;
    let bodyStyle = rtMeta.style || {};
    bodyStyle = { ...bodyStyle, backgroundColor: bodyColor.rgb || bodyColor.bg, color: bodyColor.txt };
    rtMeta.style = bodyStyle;

    // assign column id to the meta data
    const meta = Object.assign({}, rtMeta);
    meta.id = self.columnId;
    if (template.cellRenderer) {
      if (!meta.Cell) meta.Cell = self.cellRenderer; // important to do self.cellRenderer instead of template.cellRenderer
    }
    return meta;
  },
  get cellRenderer() {
    const template = self.template;
    if (!template.cellRenderer) return () => null; // return a null react component
    return template.cellRenderer({ model: self }); // model is the columnModel
  },
  get textRenderer() {
    const template = self.template;
    if (!template.textRenderer) return () => ''; // return an empty string
    return template.textRenderer({ model: self }); // model is the columnModel
  }
}));

export { ChildColumnModel };
