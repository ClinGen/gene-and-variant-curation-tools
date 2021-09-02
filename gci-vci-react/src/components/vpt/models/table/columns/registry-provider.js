// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { observable, action } from 'mobx';

import registerColumns from '../../../helpers/register-columns';
import { BaseColumnModel } from './types/BaseColumn';
import { createColumnManagerType } from './Manager';
import DefaultEditor from './editors/DefaultEditor';

function applyDefaults(registry) {
  const templates = registry.templates;
  const defaultYouCan = registry.defaultYouCan;
  _.forEach(templates, (template, id) => {
    template.id = id;
    template.type = template.type || BaseColumnModel;
    template.observed = template.observed || {};
    template.observed = observable(template.observed);
    template.youCan = template.youCan || _.slice(defaultYouCan);
    if (!template.editor) {
      template.editor = ({ model }) => <DefaultEditor model={model}/>;
    }
  });

  return templates;
}

const provide = action((globalsHolder) => {
  const columnsRegistry = {
    templates: {}, // a map of '<column-template-id>': { column template information }
    defaults: [], // a list of column template id that are used as the default columns
    types: {}, // a map of model name to model type
    managerType: undefined, // the columnsManager type
    defaultYouCan: ['Customize the header name', 'Customize the header color and body color'], // a list of user friendly descriptions of what customization is possible for a column
  };

  registerColumns(columnsRegistry);

  // lets do the necessary work for post column registration
  applyDefaults(columnsRegistry);

  const typesMap = {};
  _.forEach(columnsRegistry.templates, (template) => {
    const type = template.type;
    const name = type.name;
    typesMap[name] = type;
  });
  columnsRegistry.types = typesMap;
  columnsRegistry.managerType = createColumnManagerType(columnsRegistry);

  return columnsRegistry;
});

export default provide;

