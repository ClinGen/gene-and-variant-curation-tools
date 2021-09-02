// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import { action } from 'mobx';

import registerFilters from '../../../helpers/register-filters';
import { createFilterManagerType } from './Manager';

function applyDefaults(registry) {
  const templates = registry.templates;
  _.forEach(templates, (template, id) => {
    template.id = id;
    // template.type = template.type; || SingleValueFilterModel;
    // if (!template.editor) {
    //   template.editor = ({ model }) => <SingleValueEditor model={model}/>;
    // }
  });

  return templates;
}

const provide = action((globalsHolder) => {
  const filtersRegistry = {
    templates: {}, // a map of '<filter-template-id>': { filter template information }
    defaults: [], // a list of filter template id that are used as the default filters
    types: {}, // a map of model name to model type
    managerType: undefined, // the filtersManager type
  };

  registerFilters(filtersRegistry);

  // lets do the necessary work for post filter registration
  applyDefaults(filtersRegistry);

  const typesMap = {};
  _.forEach(filtersRegistry.templates, (template) => {
    const type = template.type;
    const name = type.name;
    typesMap[name] = type;
  });
  filtersRegistry.types = typesMap;
  filtersRegistry.managerType = createFilterManagerType(filtersRegistry);

  return filtersRegistry;
});

export default provide;

