export const computationalStatic = {
  conservation: {
    _order: [
      'phylop7way',
      'phylop20way',
      'phastconsp7way',
      'phastconsp20way',
      'gerp',
      'siphy'
    ],
    _labels: {
      'phylop7way': 'phyloP100way',
      'phylop20way': 'phyloP30way',
      'phastconsp7way': 'phastCons100way',
      'phastconsp20way': 'phastCons30way',
      'gerp': 'GERP++', 'siphy': 'SiPhy'
    },
    _url: {
      'phylop7way': 'http://compgen.cshl.edu/phast/index.php',
      'phylop20way': 'http://compgen.cshl.edu/phast/index.php',
      'phastconsp7way': 'http://compgen.cshl.edu/phast/index.php',
      'phastconsp20way': 'http://compgen.cshl.edu/phast/index.php',
      'gerp': 'http://mendel.stanford.edu/SidowLab/downloads/gerp/',
      'siphy': 'http://portals.broadinstitute.org/genome_bio/siphy/index.html'
    }
  },
  other_predictors: {
    _order: [
      'sift',
      'polyphen2_hdiv',
      'polyphen2_hvar',
      'lrt',
      'mutationtaster',
      'mutationassessor',
      'fathmm',
      'provean',
      'metasvm',
      'metalr',
      'cadd',
      'fathmm_mkl',
      'fitcons'
    ],
    _labels: {
      'sift': 'SIFT',
      'polyphen2_hdiv': 'PolyPhen2-HDIV',
      'polyphen2_hvar': 'PolyPhen2-HVAR',
      'lrt': 'LRT',
      'mutationtaster': 'MutationTaster',
      'mutationassessor': 'MutationAssessor',
      'fathmm': 'FATHMM',
      'provean': 'PROVEAN',
      'metasvm': 'MetaSVM',
      'metalr': 'MetaLR',
      'cadd': 'CADD',
      'fathmm_mkl': 'FATHMM-MKL',
      'fitcons': 'fitCons'
    },
    _type: {
      'metasvm': ' (meta-predictor)',
      'metalr': ' (meta-predictor)',
      'cadd': ' (meta-predictor)'
    },
    _url: {
      'sift': 'http://sift.bii.a-star.edu.sg/',
      'polyphen2_hdiv': 'http://genetics.bwh.harvard.edu/pph2/',
      'polyphen2_hvar': 'http://genetics.bwh.harvard.edu/pph2/',
      'lrt': 'http://www.genetics.wustl.edu/jflab/lrt_query.html',
      'mutationtaster': 'http://www.mutationtaster.org/',
      'mutationassessor': 'http://mutationassessor.org/',
      'fathmm': 'http://fathmm.biocompute.org.uk/',
      'provean': 'http://provean.jcvi.org/index.php',
      'metasvm': 'https://sites.google.com/site/jpopgen/dbNSFP',
      'metalr': 'https://sites.google.com/site/jpopgen/dbNSFP',
      'cadd': 'http://cadd.gs.washington.edu/',
      'fathmm_mkl': 'http://fathmm.biocompute.org.uk/',
      'fitcons': 'http://compgen.bscb.cornell.edu/fitCons/'
    },
    _pathoThreshold: {
      'sift': '<0.049',
      'polyphen2_hdiv': '--',
      'polyphen2_hvar': '>0.447',
      'lrt': '--',
      'mutationtaster': '>0.5',
      'mutationassessor': '>1.935',
      'fathmm': '<-1.51',
      'provean': '<-2.49',
      'metasvm': '>0',
      'metalr': '>0.5',
      'cadd': '>19 (inferred)',
      'fathmm_mkl': '--',
      'fitcons': '--'
    }
  },
  clingen: {
      _order: [
        'revel',
        'cftr'
      ],
      _labels: {
        'revel': 'REVEL',
        'cftr': 'CFTR'
      },
      _type: {
        'revel': ' (meta-predictor)'
      },
      _url: {
        'revel': 'https://sites.google.com/site/revelgenomics/about'
      },
      _pathoThreshold: {
        'revel': '>0.75',
        'cftr': '--'
      }
  }
};


export const initialComputationalData = {
  conservation: {
    phylop7way: null,
    phylop20way: null,
    phastconsp7way: null,
    phastconsp20way: null,
    gerp: null,
    siphy: null
  },
  other_predictors: {
    sift: {
      score_range: '--',
      score: null,
      prediction: null
    },
    polyphen2_hdiv: {
      score_range: '0 to 1',
      score: null,
      prediction: null
    },
    polyphen2_hvar: {
      score_range: '0 to 1',
      score: null,
      prediction: null
    },
    lrt: {
      score_range: '0 to 1',
      score: null,
      prediction: null
    },
    mutationtaster: {
      score_range: '0 to 1',
      score: null,
      prediction: null
    },
    mutationassessor: {
      score_range: '-0.5135 to 6.49',
      score: null,
      prediction: null
    },
    fathmm: {
      score_range: '-16.13 to 10.64',
      score: null,
      prediction: null
    },
    provean: {
      score_range: '-14 to +14',
      score: null,
      prediction: null
    },
    metasvm: {
      score_range: '-2 to +3',
      score: null,
      prediction: null
    },
    metalr: {
      score_range: '0 to 1',
      score: null,
      prediction: null
    },
    cadd: {
      score_range: '-7.535 to 35.789',
      score: null,
      prediction: 'higher score = higher pathogenicity'
    },
    fathmm_mkl: {
      score_range: '--',
      score: null,
      prediction: null
    },
    fitcons: {
      score_range: '0 to 1',
      score: null,
      prediction: 'higher score = higher pathogenicity'
    }
  },
  clingen: {
    revel: {
      score_range: '0 to 1',
      score: null,
      prediction: 'higher score = higher pathogenicity',
      visible: true
    },
    cftr: {
      score_range: '0 to 1',
      score: null,
      prediction: 'higher score = higher pathogenicity',
      visible: false
    }
  }
};
