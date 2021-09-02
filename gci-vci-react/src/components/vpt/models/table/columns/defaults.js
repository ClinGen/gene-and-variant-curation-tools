// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

// ==================================================================
// Defaults columns
// ==================================================================

function registerColumns(registry) {
  registry.defaults = ['tpl-caid', 'tpl-clingen-preferred-title', 'tpl-clinvar-title', 'tpl-mc', 'tpl-predictor-revel', 'tpl-vci-inter-colored', 'tpl-gnomad-combined']; //'tpl-gnomad-genome-combined-overall-table'];
}

export { registerColumns };
