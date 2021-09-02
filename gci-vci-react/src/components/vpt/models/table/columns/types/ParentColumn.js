// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import { types, getEnv } from 'mobx-state-tree';
import { ChildColumnModel } from './ChildColumn';

// ==================================================================
// ParentColumnModel
// ==================================================================
const ParentColumnModel = types.model('ParentColumnModel', {
  type: 'ParentColumnModel',
  templateId: '',
  idPrefix: '',
  localTitle: types.maybe(types.string), // overridden title
  enabled: true,
  showDetail: false,
  headerColorId: types.maybe(types.string),
  columns: types.optional(types.array(ChildColumnModel), []),
})

.actions(self => ({
  afterCreate() {
    if (!self.idPrefix) {
      self.idPrefix = `r-${Date.now()}-${_.padStart(_.random(0, 9999), 4, '0')}`;
    }
  },
  afterAttach() {
    const template = self.template;
    if (self.columns.length === 0) {
      _.forEach(template.columns, (column) => {
        self.columns.push(ChildColumnModel.create({
          id: column.id,
          enabled: column.enabled,
        }));
      });  
    }

    if (!self.headerColorId && template.headerColorId) {
      self.headerColorId = template.headerColorId;
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
}))

.views(self => ({
  get columnId() {
    return `${self.templateId}___${self.idPrefix}`;
  },
  get template() {
    const registry = getEnv(self).columnsRegistry;
    return registry.templates[self.templateId];
  },
  get labels() {
    return self.template.labels;
  },
  get headerColor() {
    const repo = getEnv(self).colorsRepo;
    const colorId = self.headerColorId || 'headerDefaults';
    return repo.colors[colorId];
  },
  get title() {
    // if we have a title then return it, otherwise return the template.title
    if (self.localTitle !== undefined) return self.localTitle;
    return self.template.title;
  },
  get description() {
    return self.template.description;
  },
  get enabledColumns() {
    return _.filter(self.columns, (col) => col.enabled);
  },
  get rtMeta() { // react-table column object
    // Logic
    // - first lets generate the rtMeta for each child column by asking each child column for its rtMeta
    // - now construct the rtMeta for this parent by invoking it as a function passing the model (self) and all the rtMeta of the columns
    // - compute the correct header color and assign the headerStyle accordingly
    // - use the column id of this model
    // - and we are done
  
    const selected = self.enabledColumns;
    const columns = _.map(selected, (col) => col.rtMeta); // columns are actually column metas
    const template = self.template;
    const rtMeta = _.isFunction(template.rtMeta)? template.rtMeta({ model: self, columns }) : template.rtMeta;

    // header color
    const headerColor = self.headerColor;
    let headerStyle = rtMeta.headerStyle || {};
    headerStyle = { backgroundColor: headerColor.bg, color: headerColor.txt, ...headerStyle };
    rtMeta.headerStyle = headerStyle;

    // assign column id to the meta data
    const meta = Object.assign({}, rtMeta);
    meta.id = self.columnId;
    return meta;
  },
  get editor() {
    const template = self.template;
    if (!template.editor) return () => null; // return a null react component
    return template.editor({ model: self }); // model is the columnModel
  },
  get population() {
    const template = self.template;
    return template.population;
  }
}));

export { ParentColumnModel };
