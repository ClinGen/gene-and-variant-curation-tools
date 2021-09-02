// latest version as of Nov, 12th 2018
const data = [{
  "vciStatus":{"d":{"a":3},"a":{"p":1}}, // "a" for affiliation, "d" for individuals  [ "p" for "provisional", "a" for "approved", "i" for "in progress" ]
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
     "clinVarRCVs":[
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
     "clinicalSignificance": "Uncertain significance"
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
},
]