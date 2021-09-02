// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';

import { titlesToIdsMap } from '../models/constants/population-mapping';
import { getConflictInfo } from './conflict';

// IMPORTANT: see input/output samples at the bottom of this file

// ==================================================================
// helper classes/functions for the internal transformation functions
// ==================================================================

class DuplicateDetector {
  constructor() {
    this.map = {};
    this.duplicate =[]
  }

  count(key) {
    let count = this.map[key]
    if (count) {
      if (count === 1) this.duplicate.push(key);
      this.map[key] = count + 1;
    } else {
      this.map[key] = 1;
    }
  }

  // allows you to iterator over the duplicate and get their counts
  forEach(fn) {
    // fn will receive two parameters, key and count
    _.forEach(this.duplicate, (key) => {
      fn(key, this.map[key]);
    });
  }
}

// removes 'INFO||||' or 'WARN||||' or 'ERROR||||'
function cleanMessages(msg = []) {
  return _.map(msg, (item) => {
    if (_.startsWith(item, 'INFO||||')) return _.split(item, 'INFO||||')[1];
    if (_.startsWith(item, 'WARN||||')) return _.split(item, 'WARN||||')[1];
    if (_.startsWith(item, 'ERROR||||')) return _.split(item, 'ERROR||||')[1];
    return item;
  });
}


function removeEmptyItems(items) {
  if (_.isEmpty(items)) return items;
  return _.filter(items, (item) => !_.isEmpty(item));
}

// ==================================================================
// toInternal transformation functions
// ==================================================================

function toInternal(input = [], gene) {
  let raw;
  const topErrors = [];
  const detector = new DuplicateDetector();

  if (!_.isArray(input)) {
    raw = input.rows || [];
    if (_.size(input.messages) > 0) {
      _.forEach(cleanMessages(input.messages), (msg) => {
        topErrors.push(msg);
      });
    }
  } else {
    raw = input;
  }

  const data = _.map(raw, (item) => {
    const errors = [];
    const id = item.caId;
    if (_.isEmpty(id)) {
      topErrors.push(`Encountered a variant that does not have a CAid, ${JSON.stringify(item)}`);
      return;
    }

    // lets detect any repeated caids
    detector.count(id);

    // the setup for each row
    const context = { id, errors, item };
    const row = {
      _id: id, // to make our lives easier with react-table
      caid: id,
      gene: item.hgnc,
      clingenPreferredTitle: item.clingenPreferredTitle,
      mc: parseMolecularConsequeneces(context, item.maneTranscripts),
      vt: item.variantTypes || [],
      predictions: parsePredictions(context, item),
      frequencies: parseFrequencies(context, item.populationAlleleFrequencyStatements),
      clinvar: parseClinvar(context, item),
      vciStatus: parseVciStatus(item.vciStatus),
      qcFilters: parseQcFilters(context, item.populationAlleleFrequencyMetadata),
      grch38HGVS: _.get(item, 'hgvsNames.GRCh38'),
      grch37HGVS: _.get(item, 'hgvsNames.GRCh37'),
      hgvsExp: removeEmptyItems(item.transcriptHGVS) || [],
      proteinEffects: removeEmptyItems(item.proteinEffects) || [],
    };

    if (errors.length > 0) {
      row.errors = errors;
      topErrors.push(...errors);
    }

    return row;
  });

  detector.forEach((key, count) => {
    topErrors.push(`The data contains "${count}" variants with the same CAid of "${key}"`);
  });

  if (topErrors.length > 0) {
    console.log('The following errors were detected while transforming the raw data');
    console.log(topErrors);
  }

  // the final shape of the result
  return {
    errors: topErrors,
    data
  };
}

function parseMolecularConsequeneces({ id, errors }, item) {
  if (item === undefined) return [];
  const result = [];
  item.forEach((transcript) => {
    if (transcript.molecularConsequences && transcript.molecularConsequences.length) {
      transcript.molecularConsequences.forEach((mc) => {
        result.push(mc.term);
      });
    }
  });
  return _.uniq(result);
}

function parseClinvar({ id, errors }, item) {
  if (item === undefined) return;
  const result = {};

  if (item.clinVarVariantTitle) result.title = item.clinVarVariantTitle;
  if (item.clinVarVariantId) result.id = item.clinVarVariantId;
  if (item.clinicalSignificanceSummary) {
    if (item.clinicalSignificanceSummary.clinVarReviewStatus) result.rv = item.clinicalSignificanceSummary.clinVarReviewStatus; // rv = clinVar review status
    result.cs = item.clinicalSignificanceSummary.clinicalSignificance; // cs = clinVar aggregated clinicalSignificance
    result.csLow = (result.cs || '').toLowerCase();
    result.csArr = _.map(_.split(result.cs, ','), (item) => _.trim(item).toLowerCase());
  }
  if (item.clinVarSignificanceCounts) result.conflict = getConflictInfo(item.clinVarSignificanceCounts);
  return result;
}

function parseVciStatus(vciStatus) {
  if (vciStatus === undefined) return;
  // remember the following
  // "a" for affiliation, "d" for individuals, [ "p" for "provisional", "a" for "approved", "i" for "in progress" ]
  // "vciStatus":{"d":{"a":3},"a":{"p":1}}
  // what we want is to add "all" as an aggregation for both individuals and affiliates, example: "all": {"a": 1, "p": 2}}

  const getCount = (prop1, prop2) => {
    if (vciStatus[prop1] && vciStatus[prop1][prop2]) return vciStatus[prop1][prop2];
    return 0;
  };
  const inProgressCount = getCount('d', 'i') + getCount('a', 'i');
  const provisionalCount = getCount('d', 'p') + getCount('a', 'p');
  const approvedCount = getCount('d', 'a') + getCount('a', 'a');

  if (inProgressCount > 0 || provisionalCount > 0 || approvedCount > 0) {
    vciStatus.all = {};
    if (inProgressCount > 0) vciStatus.all.i = inProgressCount; // we are careful not adding a property unless it is not zero
    if (provisionalCount > 0) vciStatus.all.p = provisionalCount;
    if (approvedCount > 0) vciStatus.all.a = approvedCount;
  }
  return vciStatus;
}

function parseFrequencies({ id, errors }, statements = []) {
  const add = (a, b) => { // we assume that "a" and "b" can not be undefined at the same time
    if (b === undefined) return a;
    if (a === undefined) return b;
    return a + b;
  };
  const result = {};
  const detector = new DuplicateDetector();
  const key = 'gnomad';

  for (let index in statements) {
    const item = statements[index];
    const method = item.method;
    detector.count(`${method}-${item.population}`);

    // we ignore anything that is not gnomad, this is because "ExAC" and "evs" are ignored
    // we also combine genome + exome
    if (_.startsWith(method, key)) {
      
      const mainEntry = result[key] || {};
      result[key] = mainEntry;
      const populationKey = (titlesToIdsMap[item.population] || item.population || '').toUpperCase();
      const entry = mainEntry[populationKey] || {};
      mainEntry[populationKey] = entry;

      entry.count = add(item.alleleCount, entry.count);
      entry.number = add(item.alleleNumber, entry.number);
      entry.freq = add(item.alleleFrequency, entry.freq);
      entry.homo = add(item.homozygousAlleleIndividualCount, entry.homo);
    }
  }

  detector.forEach((key, count) => {
    errors.push(`The variant "${id}" contains "${count}" entries for the "${key}" population`);
  });

  return result;
}

function parsePredictions({ id, errors }, item = []) {
  const result = {};
  const detector = new DuplicateDetector();

  result.REVEL = item.revel;

  detector.forEach((key, count) => {
    errors.push(`The variant "${id}" contains "${count}" entries for the "${key}" silico prediction scores`);
  });

  return result;
}

function parseQcFilters({ id, errors }, entries = []) {
  const result = {};
  const detector = new DuplicateDetector();

  const key = 'gnomad';

  for (let index in entries) {
    const item = entries[index];
    const method = item.method;
    detector.count(method);

    // we ignore anything that is not gnomad
    if (_.startsWith(method, key)) {
      const gOrX= method.slice(key.length + 1);  // to account for '-' in the method name
      const mainEntry = result[key] || {};
      result[key] = mainEntry;
      const gOrXEntry = mainEntry[gOrX] || {};
      mainEntry[gOrX] = gOrXEntry;

      if (item.filters && item.filters.length > 0) {
        gOrXEntry.filters = _.slice(item.filters);
      }

      if (!_.isNil(item.popmax)) {
        gOrXEntry.popmax = item.popmax;
      }
    }
  }

  detector.forEach((key, count) => {
    errors.push(`The variant "${id}" contains "${count}" entries for the "${key}" in PopulationAlleleFrequencyMetadata`);
  });

  return result;
}

export {
  toInternal,
};

// ==================================================================
// Output Sample
// This is after the ui transformer function is applied
// ==================================================================
const outputSample = { // eslint-disable-line
  errors: [], // contains error messages, such as duplication errors
  data: [{
    "caid": "CA607426712",
    "_id": "CA607426712",
    "gene": "pah",
    "predictions": {
      "M-CAP": 0.441117,
      "CADD": 0.441117,
      "REVEL": -0.564,
      "S-CAP": {
        "3 prime core dominant": 0.333,
        "3 prime core recessive": 44,
        "3 prime intronic": 444,
        "5 prime core dominant": 555,
        "5 prime core recessive": 777,
        "5 prime intronic": 88,
        "5 prime extended": 4444,
        "exonic": 5456,
      }
    },
    "vt": ["3' UTR"],
    "mc": ["Other"],
    "grch38HGVS": "NC_000012.12:g.102838440A>G",
    "grch37HGVS": "NC_000012.11:g.103232218A>G",
    "frequencies": {
      "gnomad": { // this is for both genome + exome
        "COMBINED": {  // "Combined" is the id of the population
          "count": 0,
          "freq": 0,
          "number": 0,
          "homo": 0,
        },
        "AFR": {  // "AFR" is the id of the population
          "count": 0,
          "freq": 0,
          "number": 0,
          "homo": 0,
        },
        "FEMALE": { // "FEMALE" is the id of the population
          "count": 0,
          "freq": 0,
          "homo": 0,
          "number": 0,
        },
        // ... similarly we do the same of the rest of the population, see the mapping below
      },
      // NOTE: "ExAC" and "evs" are ignored
    },
    "clinvar": {
      "title": "NM_000277.2(PAH):c.*772_*775delGTAA",
      "id": 255733,
      "rv": "criteria provided, single submitter", // rv = clinVar review status
      "cs": "Uncertain significance", // cs = clinVar aggregated clinicalSignificance
      "csLow": "uncertain significance", // same as cs but in lower case format
      "csArr": [], // same as cs but in an array form where ',' is used to split it
      "conflict": {
        "counts": {
          "likely benign": 1,
          "benign": 11
        },
        "cat": 2
      }
    },
    "hgvsExp": [
      "ENST00000307000.7:c.*19G>T",
      "XM_011538422.1:c.*19G>T"
    ],
    "proteinEffects": [
      "ENSP00000303500.2:p.=",
      "XP_011536724.1:p.="
    ],
    "qcFilters":  {  // "qc" for quality control
      "gnomad": {
        "genome": {
          "filters": ['PASS', ], // filter values, such as AC0, RF, PASS, InbreedingCoeff
          "popmax": 0.000,
        },
        "exome": {
          "filters": ['PASS', ], // filter values, such as AC0, RF, PASS, InbreedingCoeff
          "popmax": 333.0,
        }
      },
    },
    // "a" for affiliation, "d" for individuals  [ "p" for "provisional", "a" for "approved", "i" for "in progress" ],  "all" is an aggregation for both individuals and affiliates
    // during the search query
    "vciStatus":{"d":{"a":3},"a":{"p":1}, "all": {"a": 1, "p": 2}, "<affiliationId>": {"a" : 1, "p": 0}}, 
  }]
};

// ==================================================================
// Population mapping between id and title
// ==================================================================
// AFR	African
// AMR	Lation
// ASJ	Ashkenazi Jewish
// EAS	East Asian
// FIN	European (Finnish)
// NFE	European (non-Finnish)
// OTH	Other
// SAS	South Asian
	
// Subpopulation of East Asian (EAS)	
// JPN	Japenese
// KOR	Korean
// OEA	Other East Asian
	
// Subpopulation of European (non-Finnish) NFE	
// BGR	Bulgarian
// EST	Estonian
// NEW	North-western European
// ONF	Other non-Finnish European
// SEU	Southern European
// SWE	Swedish
	
// Subpopulation (applicable to all top level population)	
// FEMALE	
// MALE	


// ==================================================================
// Input Sample
// This is not a real variant, just a collection of all possible properties for a variant
// ==================================================================
const inputSample = [ // eslint-disable-line
{
  // "a" for affiliation, "d" for individuals  [ "p" for "provisional", "a" for "approved", "i" for "in progress" ]
  // the "<affiliationId" entry is only available if there was an entry and the affiliationId was provided to the server
  // during the search query
  "vciStatus":{"d":{"a":3},"a":{"p":1}, "<affiliationId>": {"a" : 1, "p": 0}}, 
  "inSilicoPredictionScoreStatements":[
      {
        "algorithm":"REVEL",
        "prediction":0.755
      },
      {
        "algorithm":"CADD",
        "prediction":6.768786
      },
      {
        "algorithm":"M-CAP",
        "prediction":0.615724670278
      },
      {
        "algorithm":"S-CAP exonic",
        "prediction":0.014369234867749022
      },
      {
        "algorithm":"S-CAP 3 prime intronic",
        "prediction":0.0022005359511053026
      }
      // more types for S-CAP
  ],
  "populationAlleleFrequencyStatements":[
      {
        "method":"gnomad-exome",
        "population":"African/African American",
        "alleleCount":1,
        "alleleNumber":15282,
        "alleleFrequency":6.54365e-05,
        "homozygousAlleleIndividualCount":0
      },
      {
        "method":"gnomad-exome",
        "population":"Admixed American",
        "alleleCount":62,
        "alleleNumber":33502,
        "alleleFrequency":0.00185064,
        "homozygousAlleleIndividualCount":2
      },
      {
        "method":"gnomad-exome",
        "population":"Ashkenazi Jewish",
        "alleleCount":9,
        "alleleNumber":9842,
        "alleleFrequency":0.000914448,
        "homozygousAlleleIndividualCount":0
      },
      {
        "method":"gnomad-exome",
        "population":"East Asian",
        "alleleCount":42,
        "alleleNumber":17240,
        "alleleFrequency":0.00243619,
        "homozygousAlleleIndividualCount":0
      },
      {
        "method":"gnomad-exome",
        "population":"Finnish",
        "alleleCount":2,
        "alleleNumber":22252,
        "alleleFrequency":8.98796e-05,
        "homozygousAlleleIndividualCount":0
      },
      {
        "method":"gnomad-exome",
        "population":"Non-Finnish European",
        "alleleCount":159,
        "alleleNumber":111330,
        "alleleFrequency":0.00142819,
        "homozygousAlleleIndividualCount":2
      },
      {
        "method":"gnomad-exome",
        "population":"Other",
        "alleleCount":14,
        "alleleNumber":5470,
        "alleleFrequency":0.00255941,
        "homozygousAlleleIndividualCount":0
      },
      {
        "method":"gnomad-exome",
        "population":"South Asian",
        "alleleCount":250,
        "alleleNumber":30776,
        "alleleFrequency":0.00812321,
        "homozygousAlleleIndividualCount":4
      },
      {
        "method":"gnomad-exome",
        "population":"Female",
        "alleleCount":173,
        "alleleNumber":111092,
        "alleleFrequency":0.00155727,
        "homozygousAlleleIndividualCount":2
      },
      {
        "method":"gnomad-exome",
        "population":"Male",
        "alleleCount":366,
        "alleleNumber":134602,
        "alleleFrequency":0.00271913,
        "homozygousAlleleIndividualCount":6
      },
      {
        "method":"gnomad-exome",
        "population":"Combined",
        "alleleCount":539,
        "alleleNumber":245694,
        "alleleFrequency":0.00219379,
        "homozygousAlleleIndividualCount":8
      },
      {
        "method":"gnomad-genome",
        "population":"African/African American",
        "alleleCount":5,
        "alleleNumber":8734,
        "alleleFrequency":0.000572475,
        "homozygousAlleleIndividualCount":0
      },
      {
        "method":"gnomad-genome",
        "population":"Admixed American",
        "alleleCount":1,
        "alleleNumber":838,
        "alleleFrequency":0.00119332,
        "homozygousAlleleIndividualCount":0
      },
      {
        "method":"gnomad-genome",
        "population":"Ashkenazi Jewish",
        "alleleCount":0,
        "alleleNumber":302,
        "alleleFrequency":0.0,
        "homozygousAlleleIndividualCount":0
      },
      {
        "method":"gnomad-genome",
        "population":"East Asian",
        "alleleCount":3,
        "alleleNumber":1618,
        "alleleFrequency":0.00185414,
        "homozygousAlleleIndividualCount":0
      },
      {
        "method":"gnomad-genome",
        "population":"Finnish",
        "alleleCount":0,
        "alleleNumber":3494,
        "alleleFrequency":0.0,
        "homozygousAlleleIndividualCount":0
      },
      {
        "method":"gnomad-genome",
        "population":"Non-Finnish European",
        "alleleCount":16,
        "alleleNumber":15010,
        "alleleFrequency":0.00106596,
        "homozygousAlleleIndividualCount":0
      },
      {
        "method":"gnomad-genome",
        "population":"Other",
        "alleleCount":0,
        "alleleNumber":982,
        "alleleFrequency":0.0,
        "homozygousAlleleIndividualCount":0
      },
      {
        "method":"gnomad-genome",
        "population":"South Asian",
        "alleleCount":0,
        "alleleNumber":0,
        "alleleFrequency":0,
        "homozygousAlleleIndividualCount":0
      },
      {
        "method":"gnomad-genome",
        "population":"Female",
        "alleleCount":13,
        "alleleNumber":13854,
        "alleleFrequency":0.000938357,
        "homozygousAlleleIndividualCount":0
      },
      {
        "method":"gnomad-genome",
        "population":"Male",
        "alleleCount":12,
        "alleleNumber":17124,
        "alleleFrequency":0.000700771,
        "homozygousAlleleIndividualCount":0
      },
      {
        "method":"gnomad-genome",
        "population":"combined",
        "alleleCount":25,
        "alleleNumber":30978,
        "alleleFrequency":0.000807024,
        "homozygousAlleleIndividualCount":0
      }
  ],
  "clinVarSubmission":{
      "reviewStatus":"criteria provided, conflicting interpretations",
      "name":"NM_000277.2(PAH):c.*19G>T",
      "clinVarRCVs":[  // RCVs no longer needed or provided
        {
            "clinVarRCV":"RCV000538868",
            "significance":"Conflicting interpretations of pathogenicity"
        },
        {
            "clinVarRCV":"RCV000252084",
            "significance":"Conflicting interpretations of pathogenicity"
        }
      ],
      "clinVarSCVs":[
        {
            "clinVarSCV":"SCV000303440.1",
            "evaluationDate":"-",
            "significance":"Likely benign"
        },
        {
            "clinVarSCV":"SCV000521187.3",
            "evaluationDate":"Aug 17, 2017",
            "significance":"Likely benign"
        },
        {
            "clinVarSCV":"SCV000788498.1",
            "evaluationDate":"Apr 27, 2017",
            "significance":"Uncertain significance"
        },
        {
            "clinVarSCV":"SCV000629166.1",
            "evaluationDate":"Jun 25, 2016",
            "significance":"Benign"
        },
        {
            "clinVarSCV":"SCV000601704.1",
            "evaluationDate":"Jul 17, 2017",
            "significance":"Likely benign"
        }
      ],
      "variation":255733,
      "clinicalSignificance": "Uncertain significance",
  },
  "molecularConsequences":[
      "3_prime_UTR_variant",
      "downstream_gene_variant",
      "missense_variant",
      "non_coding_transcript_exon_variant",
      "upstream_gene_variant",
      "downstream_gene_variant"
  ],
  "caid":"CA6748669",
  "grch38HGVS":"NC_000012.12:g.102839156C>A",
  "grch37HGVS":"NC_000012.11:g.103232934C>A",
  "transcriptHGVS":[
      "ENST00000307000.7:c.*19G>T",
      "ENST00000551114.2:n.1040G>T",
      "ENST00000553106.5:c.*19G>T",
      "ENST00000635528.1:n.893G>T",
      "NM_000277.1:c.*19G>T",
      "XM_011538422.1:c.*19G>T"
  ],
  "proteinEffects":[
      "ENSP00000303500.2:p.=",
      null,
      "ENSP00000448059.1:p.=",
      null,
      "NP_000268.1:p.=",
      "XP_011536724.1:p.="
  ],
  "PopulationAlleleFrequencyMetadata":[
      {
        "method":"gnomad-exome",
        "filters":[
            "PASS"
        ],
        "popmax":0.00812321
      },
      {
        "method":"gnomad-genome",
        "filters":[
            "PASS"
        ],
        "popmax":0.00185414
      }
  ]
}
];


