// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';

// see https://coolors.co/browser/latest/1
// and https://coolors.co/bdbdc0-e4e3df-496c96-24456e-9aa2b2
let colors = {
  'headerDefaults': { bg: 'inherit', txt: '#767676' },
  'grayX11': { bg: '#BDBDC0', txt: '#1f2d3d' },
  'platinum': { bg: '#E4E3DF', txt: '#1f2d3d' },
  'queueBlue': { bg: '#496C96', txt: '#fff' },
  'deepKoamaru': { bg: '#254670', txt: '#fff' },
  'cadetGrey': { bg: '#9AA2B2', txt: '#fff' },

  'lavenderGray': { bg: '#DEDEE2', rgb: 'rgb(222,222,226, 0.4)', txt: '#1f2d3d'},
  'whiteSmoke': { bg: '#F7F6F2', rgb: 'rgb(247,246,242, 0.4)', txt: '#1f2d3d'},
  'blueYonder': { bg: '#537AAA', rgb: 'rgb(83,122,170, 0.4)', txt: '#fff'},
  'dazzleBlue': { bg: '#2E588C', rgb: 'rgb(46,88,140, 0.4)', txt: '#fff'},
  'wildBlue': { bg: '#AAB3C4', rgb: 'rgb(170,179,196, 0.4)', txt: '#fff' }
};

_.forEach(colors, (value, key) => {
  value.id = key;
});

const headerColorsOrder = [ 'headerDefaults', 'grayX11', 'platinum', 'queueBlue', 'deepKoamaru', 'cadetGrey' ];
const bodyColorsOrder = [ 'headerDefaults', 'lavenderGray', 'whiteSmoke', 'blueYonder', 'dazzleBlue', 'wildBlue']

// A place to keep color related information and methods
const colorsRepo = {
  colors,
  headerColors: _.map(headerColorsOrder, (id) => colors[id]),
  bodyColors: _.map(bodyColorsOrder, (id) => colors[id]),
};

function register(globals) {
  globals.colorsRepo = colorsRepo;
}

export { register };
