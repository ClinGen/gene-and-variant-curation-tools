import simplejson as json
import os
import requests
from confluent_kafka import Producer
from decimal import Decimal

# SOPv7 publish GDM classification template. scoreJson.GeneticEvidence.CaseLevelData.VariantEvidence attribute has old format.
publish_classification_message_template_v7 = {
  'iri': ['$PATH_TO_DATA', 'resource', 'PK'],
  'report_id': ['$PATH_TO_DATA', 'resourceParent', 'gdm', 'PK'],
  'jsonMessageVersion': ['$COMBINE_DATA', '.',
    {
      1: ['$CONVERT_DATA', ['resourceType'],
        {
          'classification': 'GCI',
          'interpretation': 'VCI'
        }
      ],
      2: '7'
    }
  ],
  'sopVersion': '7',
  'selectedSOPVersion': ['$PATH_TO_DATA', 'resource', 'sopVersion'],
  'curationVersion': 'TO BE DETERMINED',
  'title': ['$COMBINE_DATA', ' : ',
    {
      1: ['$PATH_TO_DATA', 'resourceParent', 'gdm', 'gene', 'symbol'],
      2: ['$PATH_TO_DATA', 'resourceParent', 'gdm', 'disease', 'term']
    }
  ],
  'statusFlag': ['$PATH_TO_DATA', 'resource', 'classificationStatus'],
  'statusPublishFlag': ['$CONVERT_DATA', ['resource', 'publishClassification'],
    {
      False: 'Publish',
      True: 'Unpublish'
    }
  ],
  'type': 'clinicalValidity',
  'affiliation': {
    'id': ['$PATH_TO_DATA', 'resource', 'affiliation'],
    'name': ['$LOOKUP_AFFILIATION_DATA', ['resource', 'affiliation'], 'affiliation_fullname'],
    'gcep_id': ['$LOOKUP_AFFILIATION_DATA', ['resource', 'affiliation'], 'gcep', 'id'],
    'gcep_name': ['$LOOKUP_AFFILIATION_DATA', ['resource', 'affiliation'], 'gcep', 'fullname']
  },
  'genes': [
    {
      'ontology': 'HGNC',
      'curie': ['$PATH_TO_DATA', 'resourceParent', 'gdm', 'gene', 'hgncId'],
      'symbol': ['$PATH_TO_DATA', 'resourceParent', 'gdm', 'gene', 'symbol'],
      'uri': ['$REPLACE_DATA', ['resourceParent', 'gdm', 'gene', 'hgncId'], ':', '']
    }
  ],
  # Going to need something for free text
  'conditions': [
    {
      'ontology': 'MONDO',
      'curie': ['$REPLACE_DATA', ['resourceParent', 'gdm', 'disease', 'PK'], '_', ':'],
      'name': ['$PATH_TO_DATA', 'resourceParent', 'gdm', 'disease', 'term'],
      'uri': ['$REPLACE_DATA', ['resourceParent', 'gdm', 'disease', 'PK'], '_', ''],
      'iri': ['$COMBINE_DATA', '',
        {
          1: 'http://purl.obolibrary.org/obo/',
          2: ['$PATH_TO_DATA', 'resourceParent', 'gdm', 'disease', 'PK']
        }
      ]
    }
  ],
  'scoreJson': {
    'ModeOfInheritance': ['$PATH_TO_DATA', 'resourceParent', 'gdm', 'modeInheritance'],
    'GeneticEvidence': {
      'CaseLevelData': {
        'VariantEvidence': {
          'AutosomalDominantOrXlinkedDisorder': {
            'VariantIsDeNovo': {
              'Count': ['$EVIDENCE_COUNT', ['autosomalDominantOrXlinkedDisorder', 'variantIsDeNovo', 'evidenceCount']],
              'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'autosomalDominantOrXlinkedDisorder', 'variantIsDeNovo', 'totalPointsGiven'],
                ['autosomalDominantOrXlinkedDisorder', 'variantIsDeNovo', 'evidenceCount']],
              'PointsCounted': ['$SCORE_DATA', ['resource', 'classificationPoints', 'autosomalDominantOrXlinkedDisorder', 'variantIsDeNovo', 'pointsCounted'],
                ['autosomalDominantOrXlinkedDisorder', 'variantIsDeNovo', 'evidenceCount']],
              'Evidence': {
                'Publications': ['$EVIDENCE_DATA', 'VARIANT_IS_DE_NOVO'],
                'Notes': {
                  'note': ''
                }
              }
            },
            'ProbandWithPredictedOrProvenNullVariant': {
              'Count': ['$EVIDENCE_COUNT', ['autosomalDominantOrXlinkedDisorder', 'probandWithPredictedOrProvenNullVariant', 'evidenceCount']],
              'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'autosomalDominantOrXlinkedDisorder', 'probandWithPredictedOrProvenNullVariant', 'totalPointsGiven'],
                ['autosomalDominantOrXlinkedDisorder', 'probandWithPredictedOrProvenNullVariant', 'evidenceCount']],
              'PointsCounted': ['$SCORE_DATA', ['resource', 'classificationPoints', 'autosomalDominantOrXlinkedDisorder', 'probandWithPredictedOrProvenNullVariant', 'pointsCounted'],
                ['autosomalDominantOrXlinkedDisorder', 'probandWithPredictedOrProvenNullVariant', 'evidenceCount']],
              'Evidence': {
                'Publications': ['$EVIDENCE_DATA', 'PREDICTED_OR_PROVEN_NULL_VARIANT'],
                'Notes': {
                  'note': ''
                }
              }
            },
            'ProbandWithOtherVariantTypeWithSomeEvidenceOfGeneImpact': {
              'Count': ['$EVIDENCE_COUNT', ['autosomalDominantOrXlinkedDisorder', 'probandWithOtherVariantTypeWithGeneImpact', 'evidenceCount']],
              'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'autosomalDominantOrXlinkedDisorder', 'probandWithOtherVariantTypeWithGeneImpact', 'totalPointsGiven'],
                ['autosomalDominantOrXlinkedDisorder', 'probandWithOtherVariantTypeWithGeneImpact', 'evidenceCount']],
              'PointsCounted': ['$SCORE_DATA', ['resource', 'classificationPoints', 'autosomalDominantOrXlinkedDisorder', 'probandWithOtherVariantTypeWithGeneImpact', 'pointsCounted'],
                ['autosomalDominantOrXlinkedDisorder', 'probandWithOtherVariantTypeWithGeneImpact', 'evidenceCount']],
              'Evidence': {
                'Publications': ['$EVIDENCE_DATA', 'OTHER_VARIANT_TYPE_WITH_GENE_IMPACT'],
                'Notes': {
                  'note': ''
                }
              }
            }
          },
          'AutosomalRecessiveDisease': {
            'TwoVariantsInTransAndAtLeastOneDeNovoOrAPredictedProvenNullVariant': {
              'Count': ['$EVIDENCE_COUNT', ['autosomalRecessiveDisorder', 'twoVariantsInTransWithOneDeNovo', 'evidenceCount']],
              'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'autosomalRecessiveDisorder', 'twoVariantsInTransWithOneDeNovo', 'totalPointsGiven'],
                ['autosomalRecessiveDisorder', 'twoVariantsInTransWithOneDeNovo', 'evidenceCount']],
              'Evidence': {
                'Publications': ['$EVIDENCE_DATA', 'TWO_VARIANTS_IN_TRANS_WITH_ONE_DE_NOVO'],
                'Notes': {
                  'note': ''
                }
              }
            },
            'PointsCounted': ['$SCORE_DATA', ['resource', 'classificationPoints', 'autosomalRecessiveDisorder', 'pointsCounted'],
              ['autosomalRecessiveDisorder']],
            'TwoVariantsNotPredictedProvenNullWithSomeEvidenceOfGeneImpactInTrans': {
              'Count': ['$EVIDENCE_COUNT', ['autosomalRecessiveDisorder', 'twoVariantsWithGeneImpactInTrans', 'evidenceCount']],
              'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'autosomalRecessiveDisorder', 'twoVariantsWithGeneImpactInTrans', 'totalPointsGiven'],
                ['autosomalRecessiveDisorder', 'twoVariantsWithGeneImpactInTrans', 'evidenceCount']],
              'Evidence': {
                'Publications': ['$EVIDENCE_DATA', 'TWO_VARIANTS_WITH_GENE_IMPACT_IN_TRANS'],
                'Notes': {
                  'note': ''
                }
              }
            }
          }
        },
        'SegregationEvidence': {
          'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'segregation', 'totalPointsGiven'],
            ['segregation', 'evidenceCountTotal']],
          'PointsCounted': ['$SCORE_DATA', ['resource', 'classificationPoints', 'segregation', 'pointsCounted'],
            ['segregation', 'evidenceCountTotal']],
          'CandidateSequencingMethod': {
            'SummedLod': ['$SCORE_DATA', ['resource', 'classificationPoints', 'segregation', 'evidencePointsCandidate'],
              ['segregation', 'evidenceCountCandidate']],
            'FamilyCount': ['$EVIDENCE_COUNT', ['segregation', 'evidenceCountCandidate']],
            'Evidence': {
              'Publications': ['$EVIDENCE_DATA', 'segregation-candidate-sequencing'],
              'Notes': {
                'note': ''
              }
            }
          },
          'ExomeSequencingMethod': {
            'SummedLod': ['$SCORE_DATA', ['resource', 'classificationPoints', 'segregation', 'evidencePointsExome'],
              ['segregation', 'evidenceCountExome']],
            'FamilyCount': ['$EVIDENCE_COUNT', ['segregation', 'evidenceCountExome']],
            'Evidence': {
              'Publications': ['$EVIDENCE_DATA', 'segregation-exome-sequencing'],
              'Notes': {
                'note': ''
              }
            }
          }
        }
      },
      'CaseControlData': {
        'SingleVariantAnalysis': {
          'Count': ['$EVIDENCE_DATA', 'case-control-single-count'],
          'TotalPoints': ['$EVIDENCE_DATA', 'case-control-single-points', True],
          'Evidence': {
            'Publications': ['$EVIDENCE_DATA', 'case-control-single'],
            'Notes': {
              'note': ''
            }
          }
        },
        'PointsCounted': ['$SCORE_DATA', ['resource', 'classificationPoints', 'caseControl', 'pointsCounted'],
          ['caseControl', 'evidenceCount']],
        'AggregateVariantAnalysis': {
          'Count': ['$EVIDENCE_DATA', 'case-control-aggregate-count'],
          'TotalPoints': ['$EVIDENCE_DATA', 'case-control-aggregate-points', True],
          'Evidence': {
            'Publications': ['$EVIDENCE_DATA', 'case-control-aggregate'],
            'Notes': {
              'note': ''
            }
          }
        }
      },
      'TotalGeneticEvidencePoints': {
        'PointsCounted': ['$SCORE_DATA', ['resource', 'classificationPoints', 'geneticEvidenceTotal'], True],
        'Notes': ''
      }
    },
    'ExperimentalEvidence': {
      'Function': {
        'BiochemicalFunction': {
          'Count': ['$EVIDENCE_COUNT', ['function', 'biochemicalFunctions', 'evidenceCount']],
          'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'function', 'biochemicalFunctions', 'totalPointsGiven'],
            ['function', 'biochemicalFunctions', 'evidenceCount']],
          'Evidence': {
            'Publications': ['$EVIDENCE_DATA', 'exp-biochemical-function'],
            'Notes': {
              'note': ''
            }
          }
        },
        'PointsCounted': ['$SCORE_DATA', ['resource', 'classificationPoints', 'function', 'pointsCounted'],
          ['function']],
        'ProteinInteraction': {
          'Count': ['$EVIDENCE_COUNT', ['function', 'proteinInteractions', 'evidenceCount']],
          'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'function', 'proteinInteractions', 'totalPointsGiven'],
            ['function', 'proteinInteractions', 'evidenceCount']],
          'Evidence': {
            'Publications': ['$EVIDENCE_DATA', 'exp-protein-interactions'],
            'Notes': {
              'note': ''
            }
          }
        },
        'Expression': {
          'Count': ['$EVIDENCE_COUNT', ['function', 'expression', 'evidenceCount']],
          'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'function', 'expression', 'totalPointsGiven'],
            ['function', 'expression', 'evidenceCount']],
          'Evidence': {
            'Publications': ['$EVIDENCE_DATA', 'exp-expression'],
            'Notes': {
              'note': ''
            }
          }
        }
      },
      'FunctionalAlteration': {
        'PatientCells': {
          'Count': ['$EVIDENCE_COUNT', ['functionalAlteration', 'patientCells', 'evidenceCount']],
          'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'functionalAlteration', 'patientCells', 'totalPointsGiven'],
            ['functionalAlteration', 'patientCells', 'evidenceCount']],
          'Evidence': {
            'Publications': ['$EVIDENCE_DATA', 'exp-functional-alteration-patient-cells'],
            'Notes': {
              'note': ''
            }
          }
        },
        'PointsCounted': ['$SCORE_DATA', ['resource', 'classificationPoints', 'functionalAlteration', 'pointsCounted'],
          ['functionalAlteration']],
        'NonPatientCells': {
          'Count': ['$EVIDENCE_COUNT', ['functionalAlteration', 'nonPatientCells', 'evidenceCount']],
          'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'functionalAlteration', 'nonPatientCells', 'totalPointsGiven'],
            ['functionalAlteration', 'nonPatientCells', 'evidenceCount']],
          'Evidence': {
            'Publications': ['$EVIDENCE_DATA', 'exp-functional-alteration-non-patient-cells'],
            'Notes': {
              'note': ''
            }
          }
        }
      },
      'Models': {
        'NonHumanModelOrganism': {
          'Count': ['$EVIDENCE_COUNT', ['modelsRescue', 'modelsNonHuman', 'evidenceCount']],
          'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'modelsRescue', 'modelsNonHuman', 'totalPointsGiven'],
            ['modelsRescue', 'modelsNonHuman', 'evidenceCount']]
        },
        'CellCultureModel': {
          'Count': ['$EVIDENCE_COUNT', ['modelsRescue', 'modelsCellCulture', 'evidenceCount']],
          'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'modelsRescue', 'modelsCellCulture', 'totalPointsGiven'],
            ['modelsRescue', 'modelsCellCulture', 'evidenceCount']],
          'Evidence': {
            'Publications': ['$EVIDENCE_DATA', 'exp-model-systems-cell-culture-model'],
            'Notes': {
              'note': ''
            }
          }
        }
      },
      'ModelsRescue': {
        'Count': ['$EVIDENCE_DATA', 'exp-model-systems-and-rescue-count'],
        'PointsCounted': ['$SCORE_DATA', ['resource', 'classificationPoints', 'modelsRescue', 'pointsCounted'],
          ['modelsRescue']],
        'NonHumanModelOrganism': {
          'Evidence': {
            'Publications': ['$EVIDENCE_DATA', 'exp-model-systems-non-human-model-organism'],
            'Notes': {
              'note': ''
            }
          }
        }
      },
      'Rescue': {
        'RescueInHuman': {
          'Count': ['$EVIDENCE_COUNT', ['modelsRescue', 'rescueHuman', 'evidenceCount']],
          'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'modelsRescue', 'rescueHuman', 'totalPointsGiven'],
            ['modelsRescue', 'rescueHuman', 'evidenceCount']],
          'Evidence': {
            'Publications': ['$EVIDENCE_DATA', 'exp-rescue-human'],
            'Notes': {
              'note': ''
            }
          }
        },
        'RescueInNonHumanModelOrganism': {
          'Count': ['$EVIDENCE_COUNT', ['modelsRescue', 'rescueNonHuman', 'evidenceCount']],
          'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'modelsRescue', 'rescueNonHuman', 'totalPointsGiven'],
            ['modelsRescue', 'rescueNonHuman', 'evidenceCount']],
          'Evidence': {
            'Publications': ['$EVIDENCE_DATA', 'exp-rescue-non-human-model-organism'],
            'Notes': {
              'note': ''
            }
          }
        },
        'RescueInCellCultureModel': {
          'Count': ['$EVIDENCE_COUNT', ['modelsRescue', 'rescueCellCulture', 'evidenceCount']],
          'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'modelsRescue', 'rescueCellCulture', 'totalPointsGiven'],
            ['modelsRescue', 'rescueCellCulture', 'evidenceCount']],
          'Evidence': {
            'Publications': ['$EVIDENCE_DATA', 'exp-rescue-cell-culture-model'],
            'Notes': {
              'note': ''
            }
          }
        },
        'RescueInPatientCell': {
          'Count': ['$EVIDENCE_COUNT', ['modelsRescue', 'rescuePatientCells', 'evidenceCount']],
          'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'modelsRescue', 'rescuePatientCells', 'totalPointsGiven'],
            ['modelsRescue', 'rescuePatientCells', 'evidenceCount']],
          'Evidence': {
            'Publications': ['$EVIDENCE_DATA', 'exp-rescue-patient-cells'],
            'Notes': {
              'note': ''
            }
          }
        }
      },
      'TotalExperimentalEvidencePoints': {
        'PointsCounted': ['$SCORE_DATA', ['resource', 'classificationPoints', 'experimentalEvidenceTotal'], True],
        'Notes': ''
      }
    },
    'summary': {
      'GeneticEvidenceTotal': ['$SCORE_DATA', ['resource', 'classificationPoints', 'geneticEvidenceTotal'], True],
      'ExperimentalEvidenceTotal': ['$SCORE_DATA', ['resource', 'classificationPoints', 'experimentalEvidenceTotal'], True],
      'EvidencePointsTotal': ['$SCORE_DATA', ['resource', 'classificationPoints', 'evidencePointsTotal'], True],
      'CalculatedClassification': ['$PATH_TO_DATA', 'resource', 'autoClassification'],
      'CalculatedClassificationDate': ['$USE_FIRST_DATA', '', ['resource', 'classificationDate'], ['resource', 'provisionalDate']],
      'CuratorModifyCalculation': ['$CONVERT_DATA', ['resource', 'alteredClassification'],
        {
          'No Modification': 'NO',
          '$DEFAULT': 'YES'
        }
      ],
      'CuratorClassification': ['$PATH_TO_DATA', 'resource', 'alteredClassification'],
      'CuratorClassificationDate': ['$USE_FIRST_DATA', '', ['resource', 'classificationDate'], ['resource', 'provisionalDate']],
      'CuratorClassificationNotes': ['$PATH_TO_DATA', 'resource', 'reasons'],
      'ProvisionalClassification': ['$PATH_TO_DATA', 'resource', 'alteredClassification'],
      'ProvisionalClassificationDate': ['$USE_FIRST_DATA', '', ['resource', 'provisionalReviewDate'], ['resource', 'provisionalDate']],
      'ProvisionalClassificationNotes': ['$PATH_TO_DATA', 'resource', 'reasons'],
      'FinalClassification': ['$USE_FIRST_DATA', 'No Modification', ['resource', 'alteredClassification'], ['resource', 'autoClassification']],
      'FinalClassificationDate': ['$USE_FIRST_DATA', '', ['resource', 'approvalReviewDate'], ['resource', 'approvalDate']],
      'FinalClassificationNotes': ['$PATH_TO_DATA', 'resource', 'evidenceSummary']
      # Animal Model only (at key "AnimalModelOnly") added here (dynamically)
      # Secondary contributors/approver (at key "contributors") added here (dynamically)
    },
    'ReplicationOverTime': ['$CONVERT_DATA', ['resource', 'replicatedOverTime'],
      {
        False: 'NO',
        True: 'YES'
      }
    ],
    'ValidContradictoryEvidence': {
      # A yes/no value (at key "Value") and evidence added here (dynamically)
    }
  }
}

# SOPv8 publish GDM classification template. scoreJson.GeneticEvidence.CaseLevelData.VariantEvidence attribute has new format and new EarliestArticles attribute.,
# Set jsonMessageVersion to 8.1 to provide a simply way to know that this JSON format is to handle slightly different data
publish_classification_message_template = {
  'iri': ['$PATH_TO_DATA', 'resource', 'PK'],
  'report_id': ['$PATH_TO_DATA', 'resourceParent', 'gdm', 'PK'],
  'jsonMessageVersion': ['$COMBINE_DATA', '.',
    {
      1: ['$CONVERT_DATA', ['resourceType'],
        {
          'classification': 'GCI',
          'interpretation': 'VCI'
        }
      ],
      2: '8.1'
    }
  ],
  'sopVersion': '8',
  'selectedSOPVersion': ['$PATH_TO_DATA', 'resource', 'sopVersion'],
  'curationVersion': 'TO BE DETERMINED',
  'title': ['$COMBINE_DATA', ' : ',
    {
      1: ['$PATH_TO_DATA', 'resourceParent', 'gdm', 'gene', 'symbol'],
      2: ['$PATH_TO_DATA', 'resourceParent', 'gdm', 'disease', 'term']
    }
  ],
  'statusFlag': ['$PATH_TO_DATA', 'resource', 'classificationStatus'],
  'statusPublishFlag': ['$CONVERT_DATA', ['resource', 'publishClassification'],
    {
      False: 'Publish',
      True: 'Unpublish'
    }
  ],
  'type': 'clinicalValidity',
  'affiliation': {
    'id': ['$PATH_TO_DATA', 'resource', 'affiliation'],
    'name': ['$LOOKUP_AFFILIATION_DATA', ['resource', 'affiliation'], 'affiliation_fullname'],
    'gcep_id': ['$LOOKUP_AFFILIATION_DATA', ['resource', 'affiliation'], 'gcep', 'id'],
    'gcep_name': ['$LOOKUP_AFFILIATION_DATA', ['resource', 'affiliation'], 'gcep', 'fullname']
  },
  'genes': [
    {
      'ontology': 'HGNC',
      'curie': ['$PATH_TO_DATA', 'resourceParent', 'gdm', 'gene', 'hgncId'],
      'symbol': ['$PATH_TO_DATA', 'resourceParent', 'gdm', 'gene', 'symbol'],
      'uri': ['$REPLACE_DATA', ['resourceParent', 'gdm', 'gene', 'hgncId'], ':', '']
    }
  ],
  # Going to need something for free text
  'conditions': [
    {
      'ontology': 'MONDO',
      'curie': ['$REPLACE_DATA', ['resourceParent', 'gdm', 'disease', 'PK'], '_', ':'],
      'name': ['$PATH_TO_DATA', 'resourceParent', 'gdm', 'disease', 'term'],
      'uri': ['$REPLACE_DATA', ['resourceParent', 'gdm', 'disease', 'PK'], '_', ''],
      'iri': ['$COMBINE_DATA', '',
        {
          1: 'http://purl.obolibrary.org/obo/',
          2: ['$PATH_TO_DATA', 'resourceParent', 'gdm', 'disease', 'PK']
        }
      ]
    }
  ],
  'scoreJson': {
    'ModeOfInheritance': ['$PATH_TO_DATA', 'resourceParent', 'gdm', 'modeInheritance'],
    'GeneticEvidence': {
      'CaseLevelData': {
        'VariantEvidence': {
          'AutosomalDominantOrXlinkedDisorder': {
            'ProbandWithPredictedOrProvenNull': {
              'VariantCount': ['$EVIDENCE_COUNT', ['autosomalDominantOrXlinkedDisorder', 'probandWithPredictedOrProvenNull', 'evidenceCount']],
              'ProbandCount': ['$EVIDENCE_COUNT', ['autosomalDominantOrXlinkedDisorder', 'probandWithPredictedOrProvenNull', 'probandCount']],
              'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'autosomalDominantOrXlinkedDisorder', 'probandWithPredictedOrProvenNull', 'totalPointsGiven'],
                ['autosomalDominantOrXlinkedDisorder', 'probandWithPredictedOrProvenNull', 'evidenceCount']],
              'PointsCounted': ['$SCORE_DATA', ['resource', 'classificationPoints', 'autosomalDominantOrXlinkedDisorder', 'probandWithPredictedOrProvenNull', 'pointsCounted'],
                ['autosomalDominantOrXlinkedDisorder', 'probandWithPredictedOrProvenNull', 'evidenceCount']],
              'Evidence': {
                'Publications': ['$EVIDENCE_DATA', 'PREDICTED_OR_PROVEN_NULL'],
                'Notes': {
                  'note': ''
                }
              }
            },
	    'ProbandWithOtherVariantType': {
              'VariantCount': ['$EVIDENCE_COUNT', ['autosomalDominantOrXlinkedDisorder', 'probandWithOtherVariantType', 'evidenceCount']],
              'ProbandCount': ['$EVIDENCE_COUNT', ['autosomalDominantOrXlinkedDisorder', 'probandWithOtherVariantType', 'probandCount']],
              'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'autosomalDominantOrXlinkedDisorder', 'probandWithOtherVariantType', 'totalPointsGiven'],
                ['autosomalDominantOrXlinkedDisorder', 'probandWithOtherVariantTypeWithGeneImpact', 'evidenceCount']],
              'PointsCounted': ['$SCORE_DATA', ['resource', 'classificationPoints', 'autosomalDominantOrXlinkedDisorder', 'probandWithOtherVariantType', 'pointsCounted'],
                ['autosomalDominantOrXlinkedDisorder', 'probandWithOtherVariantType', 'evidenceCount']],
              'Evidence': {
                'Publications': ['$EVIDENCE_DATA', 'OTHER_VARIANT_TYPE'],
                'Notes': {
                  'note': ''
                }
              }
            }
          },
          'AutosomalRecessiveDisease': {
            'ProbandWithPredictedOrProvenNull': {
              'VariantCount': ['$EVIDENCE_COUNT', ['autosomalRecessiveDisorder', 'probandWithPredictedOrProvenNull', 'evidenceCount']],
              'Evidence': {
                'Publications': ['$EVIDENCE_DATA', 'AUTOREC_PREDICTED_OR_PROVEN_NULL'],
                'Notes': {
                  'note': ''
                }
              }
            },
            'ProbandCount': ['$SCORE_DATA', ['resource', 'classificationPoints', 'autosomalRecessiveDisorder', 'probandCount'],
              ['autosomalRecessiveDisorder']],
            'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'autosomalRecessiveDisorder', 'pointsGiven'],
              ['autosomalRecessiveDisorder']],
            'PointsCounted': ['$SCORE_DATA', ['resource', 'classificationPoints', 'autosomalRecessiveDisorder', 'pointsCounted'],
              ['autosomalRecessiveDisorder']],
            'ProbandWithOtherVariantType': {
              'VariantCount': ['$EVIDENCE_COUNT', ['autosomalRecessiveDisorder', 'probandWithOtherVariantType', 'evidenceCount']],
              'Evidence': {
                'Publications': ['$EVIDENCE_DATA', 'AUTOREC_OTHER_VARIANT_TYPE'],
                'Notes': {
                  'note': ''
                }
              }
            }
          }
        },
        'SegregationEvidence': {
          'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'segregation', 'totalPointsGiven'],
            ['segregation', 'evidenceCountTotal']],
          'PointsCounted': ['$SCORE_DATA', ['resource', 'classificationPoints', 'segregation', 'pointsCounted'],
            ['segregation', 'evidenceCountTotal']],
          'CandidateSequencingMethod': {
            'SummedLod': ['$SCORE_DATA', ['resource', 'classificationPoints', 'segregation', 'evidencePointsCandidate'],
              ['segregation', 'evidenceCountCandidate']],
            'FamilyCount': ['$EVIDENCE_COUNT', ['segregation', 'evidenceCountCandidate']],
            'Evidence': {
              'Publications': ['$EVIDENCE_DATA', 'segregation-candidate-sequencing'],
              'Notes': {
                'note': ''
              }
            }
          },
          'ExomeSequencingMethod': {
            'SummedLod': ['$SCORE_DATA', ['resource', 'classificationPoints', 'segregation', 'evidencePointsExome'],
              ['segregation', 'evidenceCountExome']],
            'FamilyCount': ['$EVIDENCE_COUNT', ['segregation', 'evidenceCountExome']],
            'Evidence': {
              'Publications': ['$EVIDENCE_DATA', 'segregation-exome-sequencing'],
              'Notes': {
                'note': ''
              }
            }
          }
        }
      },
      'CaseControlData': {
        'SingleVariantAnalysis': {
          'Count': ['$EVIDENCE_DATA', 'case-control-single-count'],
          'TotalPoints': ['$EVIDENCE_DATA', 'case-control-single-points', True],
          'Evidence': {
            'Publications': ['$EVIDENCE_DATA', 'case-control-single'],
            'Notes': {
              'note': ''
            }
          }
        },
        'PointsCounted': ['$SCORE_DATA', ['resource', 'classificationPoints', 'caseControl', 'pointsCounted'],
          ['caseControl', 'evidenceCount']],
        'AggregateVariantAnalysis': {
          'Count': ['$EVIDENCE_DATA', 'case-control-aggregate-count'],
          'TotalPoints': ['$EVIDENCE_DATA', 'case-control-aggregate-points', True],
          'Evidence': {
            'Publications': ['$EVIDENCE_DATA', 'case-control-aggregate'],
            'Notes': {
              'note': ''
            }
          }
        }
      },
      'TotalGeneticEvidencePoints': {
        'PointsCounted': ['$SCORE_DATA', ['resource', 'classificationPoints', 'geneticEvidenceTotal'], True],
        'Notes': ''
      }
    },
    'ExperimentalEvidence': {
      'Function': {
        'BiochemicalFunction': {
          'Count': ['$EVIDENCE_COUNT', ['function', 'biochemicalFunctions', 'evidenceCount']],
          'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'function', 'biochemicalFunctions', 'totalPointsGiven'],
            ['function', 'biochemicalFunctions', 'evidenceCount']],
          'Evidence': {
            'Publications': ['$EVIDENCE_DATA', 'exp-biochemical-function'],
            'Notes': {
              'note': ''
            }
          }
        },
        'PointsCounted': ['$SCORE_DATA', ['resource', 'classificationPoints', 'function', 'pointsCounted'],
          ['function']],
        'ProteinInteraction': {
          'Count': ['$EVIDENCE_COUNT', ['function', 'proteinInteractions', 'evidenceCount']],
          'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'function', 'proteinInteractions', 'totalPointsGiven'],
            ['function', 'proteinInteractions', 'evidenceCount']],
          'Evidence': {
            'Publications': ['$EVIDENCE_DATA', 'exp-protein-interactions'],
            'Notes': {
              'note': ''
            }
          }
        },
        'Expression': {
          'Count': ['$EVIDENCE_COUNT', ['function', 'expression', 'evidenceCount']],
          'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'function', 'expression', 'totalPointsGiven'],
            ['function', 'expression', 'evidenceCount']],
          'Evidence': {
            'Publications': ['$EVIDENCE_DATA', 'exp-expression'],
            'Notes': {
              'note': ''
            }
          }
        }
      },
      'FunctionalAlteration': {
        'PatientCells': {
          'Count': ['$EVIDENCE_COUNT', ['functionalAlteration', 'patientCells', 'evidenceCount']],
          'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'functionalAlteration', 'patientCells', 'totalPointsGiven'],
            ['functionalAlteration', 'patientCells', 'evidenceCount']],
          'Evidence': {
            'Publications': ['$EVIDENCE_DATA', 'exp-functional-alteration-patient-cells'],
            'Notes': {
              'note': ''
            }
          }
        },
        'PointsCounted': ['$SCORE_DATA', ['resource', 'classificationPoints', 'functionalAlteration', 'pointsCounted'],
          ['functionalAlteration']],
        'NonPatientCells': {
          'Count': ['$EVIDENCE_COUNT', ['functionalAlteration', 'nonPatientCells', 'evidenceCount']],
          'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'functionalAlteration', 'nonPatientCells', 'totalPointsGiven'],
            ['functionalAlteration', 'nonPatientCells', 'evidenceCount']],
          'Evidence': {
            'Publications': ['$EVIDENCE_DATA', 'exp-functional-alteration-non-patient-cells'],
            'Notes': {
              'note': ''
            }
          }
        }
      },
      'Models': {
        'NonHumanModelOrganism': {
          'Count': ['$EVIDENCE_COUNT', ['modelsRescue', 'modelsNonHuman', 'evidenceCount']],
          'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'modelsRescue', 'modelsNonHuman', 'totalPointsGiven'],
            ['modelsRescue', 'modelsNonHuman', 'evidenceCount']]
        },
        'CellCultureModel': {
          'Count': ['$EVIDENCE_COUNT', ['modelsRescue', 'modelsCellCulture', 'evidenceCount']],
          'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'modelsRescue', 'modelsCellCulture', 'totalPointsGiven'],
            ['modelsRescue', 'modelsCellCulture', 'evidenceCount']],
          'Evidence': {
            'Publications': ['$EVIDENCE_DATA', 'exp-model-systems-cell-culture-model'],
            'Notes': {
              'note': ''
            }
          }
        }
      },
      'ModelsRescue': {
        'Count': ['$EVIDENCE_DATA', 'exp-model-systems-and-rescue-count'],
        'PointsCounted': ['$SCORE_DATA', ['resource', 'classificationPoints', 'modelsRescue', 'pointsCounted'],
          ['modelsRescue']],
        'NonHumanModelOrganism': {
          'Evidence': {
            'Publications': ['$EVIDENCE_DATA', 'exp-model-systems-non-human-model-organism'],
            'Notes': {
              'note': ''
            }
          }
        }
      },
      'Rescue': {
        'RescueInHuman': {
          'Count': ['$EVIDENCE_COUNT', ['modelsRescue', 'rescueHuman', 'evidenceCount']],
          'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'modelsRescue', 'rescueHuman', 'totalPointsGiven'],
            ['modelsRescue', 'rescueHuman', 'evidenceCount']],
          'Evidence': {
            'Publications': ['$EVIDENCE_DATA', 'exp-rescue-human'],
            'Notes': {
              'note': ''
            }
          }
        },
        'RescueInNonHumanModelOrganism': {
          'Count': ['$EVIDENCE_COUNT', ['modelsRescue', 'rescueNonHuman', 'evidenceCount']],
          'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'modelsRescue', 'rescueNonHuman', 'totalPointsGiven'],
            ['modelsRescue', 'rescueNonHuman', 'evidenceCount']],
          'Evidence': {
            'Publications': ['$EVIDENCE_DATA', 'exp-rescue-non-human-model-organism'],
            'Notes': {
              'note': ''
            }
          }
        },
        'RescueInCellCultureModel': {
          'Count': ['$EVIDENCE_COUNT', ['modelsRescue', 'rescueCellCulture', 'evidenceCount']],
          'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'modelsRescue', 'rescueCellCulture', 'totalPointsGiven'],
            ['modelsRescue', 'rescueCellCulture', 'evidenceCount']],
          'Evidence': {
            'Publications': ['$EVIDENCE_DATA', 'exp-rescue-cell-culture-model'],
            'Notes': {
              'note': ''
            }
          }
        },
        'RescueInPatientCell': {
          'Count': ['$EVIDENCE_COUNT', ['modelsRescue', 'rescuePatientCells', 'evidenceCount']],
          'TotalPoints': ['$SCORE_DATA', ['resource', 'classificationPoints', 'modelsRescue', 'rescuePatientCells', 'totalPointsGiven'],
            ['modelsRescue', 'rescuePatientCells', 'evidenceCount']],
          'Evidence': {
            'Publications': ['$EVIDENCE_DATA', 'exp-rescue-patient-cells'],
            'Notes': {
              'note': ''
            }
          }
        }
      },
      'TotalExperimentalEvidencePoints': {
        'PointsCounted': ['$SCORE_DATA', ['resource', 'classificationPoints', 'experimentalEvidenceTotal'], True],
        'Notes': ''
      }
    },
    'summary': {
      'GeneticEvidenceTotal': ['$SCORE_DATA', ['resource', 'classificationPoints', 'geneticEvidenceTotal'], True],
      'ExperimentalEvidenceTotal': ['$SCORE_DATA', ['resource', 'classificationPoints', 'experimentalEvidenceTotal'], True],
      'EvidencePointsTotal': ['$SCORE_DATA', ['resource', 'classificationPoints', 'evidencePointsTotal'], True],
      'CalculatedClassification': ['$PATH_TO_DATA', 'resource', 'autoClassification'],
      'CalculatedClassificationDate': ['$USE_FIRST_DATA', '', ['resource', 'classificationDate'], ['resource', 'provisionalDate']],
      'CuratorModifyCalculation': ['$CONVERT_DATA', ['resource', 'alteredClassification'],
        {
          'No Modification': 'NO',
          '$DEFAULT': 'YES'
        }
      ],
      'CuratorClassification': ['$PATH_TO_DATA', 'resource', 'alteredClassification'],
      'CuratorClassificationDate': ['$USE_FIRST_DATA', '', ['resource', 'classificationDate'], ['resource', 'provisionalDate']],
      'CuratorClassificationNotes': ['$PATH_TO_DATA', 'resource', 'reasons'],
      'ProvisionalClassification': ['$PATH_TO_DATA', 'resource', 'alteredClassification'],
      'ProvisionalClassificationDate': ['$USE_FIRST_DATA', '', ['resource', 'provisionalReviewDate'], ['resource', 'provisionalDate']],
      'ProvisionalClassificationNotes': ['$PATH_TO_DATA', 'resource', 'reasons'],
      'FinalClassification': ['$USE_FIRST_DATA', 'No Modification', ['resource', 'alteredClassification'], ['resource', 'autoClassification']],
      'FinalClassificationDate': ['$USE_FIRST_DATA', '', ['resource', 'approvalReviewDate'], ['resource', 'approvalDate']],
      'FinalClassificationNotes': ['$PATH_TO_DATA', 'resource', 'evidenceSummary']
      # Animal Model only (at key "AnimalModelOnly") added here (dynamically)
      # Secondary contributors/approver (at key "contributors") added here (dynamically)
    },
    'ReplicationOverTime': ['$CONVERT_DATA', ['resource', 'replicatedOverTime'],
      {
        False: 'NO',
        True: 'YES'
      }
    ],
    # SOP8 - add EarliestPublications pmid and year
    'EarliestArticles': [],
    'ValidContradictoryEvidence': {
      # A yes/no value (at key "Value") and evidence added here (dynamically)
    }
  }
}

publish_interpretation_message_template = {
  'interpretation': ['$PATH_TO_DATA', 'resourceParent', 'interpretation'],
  'statusPublishFlag': ['$CONVERT_DATA', ['resource', 'publishClassification'],
    {
      False: 'Publish',
      True: 'Unpublish',
      '$DEFAULT': 'Publish'
    }
  ]
}

publish_interpretation_data_to_remove = [
  ['actions'],
  ['audit'],
  ['interpretation_disease'],
  ['interpretation_genes'],
  ['interpretation_status'],
  ['modified_by'],
  ['schema_version'],
  ['disease', 'associatedGdm'],
  ['disease', 'associatedGroups'],
  ['disease', 'associatedFamilies'],
  ['disease', 'associatedIndividuals'],
  ['disease', 'associatedInterpretations'],
  ['disease', 'modified_by'],
  ['disease', 'schema_version'],
  ['evaluations', [
    ['disease'],
    ['interpretation_associated'],
    ['modified_by'],
    ['schema_version'],
    ['computational', 'evaluation_associated'],
    ['computational', 'modified_by'],
    ['computational', 'schema_version'],
    ['computational', 'variant'],
    ['population', 'evaluation_associated'],
    ['population', 'modified_by'],
    ['population', 'schema_version'],
    ['population', 'variant']
  ]],
  ['provisional_variant', 'associatedInterpretationSnapshots'],
  ['provisional_variant', 'interpretation_associated'],
  ['provisional_variant', 'modified_by'],
  ['provisional_variant', 'schema_version'],
  ['provisionalVariant', 'associatedInterpretationSnapshots'],
  ['provisionalVariant', 'interpretation_associated'],
  ['provisionalVariant', 'modified_by'],
  ['provisionalVariant', 'schema_version'],
  ['variant', 'associatedInterpretations'],
  ['variant', 'associatedPathogenicities'],
  ['variant', 'modified_by'],
  ['variant', 'schema_version']
]

local_file_dir = os.environ.get('LOCAL_FILE_DIR', '')
affiliation_data = []
saved_affiliation = []

# Retrieve data from search result(s) using a path (list of keys)
def get_data_by_path(data, path, return_no_data=None):
  if isinstance(data, dict) and isinstance(path, list) and len(path) > 0 and path[0] in data:
    for key in path:
      if key in data and data[key] is not None:
        data = data[key]
      else:
        return return_no_data

    return data
  else:
    return return_no_data

# Check if data (evidence, score, etc.) was created by the target affiliation (from the classification)
def check_data_ownership(data, affiliation):
  if 'affiliation' in data and isinstance(data['affiliation'], str):
    if isinstance(affiliation, str):
      if affiliation == data['affiliation']:
        return True

  return False

# Check if article should be added to evidence dictionary
def is_article_new(evidence, category, annotation):
  if 'article' in annotation:
    if 'pmid' in annotation['article']:
      if category not in evidence:
        evidence[category] = []
        return True
      else:
        for publication in evidence[category]:
          if publication['pmid'] == annotation['article']['pmid']:
            return False

        return True
    else:
      return False
  else:
    return False

# Check if scored individual evidence should be added to evidence dictionary
# SOP template version 7 - get category from caseInfoType attribute
def check_individual_scoring_v7(score, evidence, annotation):
  if 'scoreStatus' in score:
    if score['scoreStatus'] == 'Score':
      if 'caseInfoType' in score:
        if is_article_new(evidence, score['caseInfoType'], annotation):
          return (True, score['caseInfoType'])

    elif score['scoreStatus'] == 'Contradicts':
      if is_article_new(evidence, 'contradicts', annotation):
        return (True, 'contradicts')

  return (False, )

# Check if scored individual evidence should be added to evidence dictionary
# SOP template version 8 - get category from moiType, probandIs and variantType attribute
def check_individual_scoring_v8(moiType, probandIs, score, evidence, annotation):
  # Set categery for the score
  prefix = ""
  if ("Autosomal recessive" in moiType) or ("Semidominant" in moiType and "Biallelic" in probandIs):
    prefix = "AUTOREC_"

  if 'scoreStatus' in score:
    if score['scoreStatus'] == 'Score':
      if 'variantType' in score:
        category = prefix + score['variantType']
        if is_article_new(evidence, category, annotation):
          return (True, category)

    elif score['scoreStatus'] == 'Contradicts':
      if is_article_new(evidence, 'contradicts', annotation):
        return (True, 'contradicts')

  return (False, )

# Check if scored individual evidence should be added to evidence dictionary
def check_individual_scoring(templateVersion, moiType, probandIs, score, evidence_publications, annotation):
  if templateVersion == 7:
    return check_individual_scoring_v7(score, evidence_publications, annotation)
  else:
    return check_individual_scoring_v8(moiType, probandIs, score, evidence_publications, annotation)


# Check if scored segregation evidence should be added to evidence dictionary
def check_segregation_scoring(family, evidence, annotation):
  segregation = get_data_by_path(family, ['segregation'], {})

  if 'includeLodScoreInAggregateCalculation' in segregation and segregation['includeLodScoreInAggregateCalculation']:
    if 'publishedLodScore' in segregation or 'estimatedLodScore' in segregation:
      if 'sequencingMethod' in segregation:
        if segregation['sequencingMethod'] == 'Candidate gene sequencing':
          if is_article_new(evidence, 'segregation-candidate-sequencing', annotation):
            return (True, 'segregation-candidate-sequencing')
        elif segregation['sequencingMethod'] == 'Exome/genome or all genes sequenced in linkage region':
          if is_article_new(evidence, 'segregation-exome-sequencing', annotation):
            return (True, 'segregation-exome-sequencing')

  return (False, )

# Check if scored case control evidence should be added to evidence dictionary
def check_case_control_scoring(case_control, score, evidence, annotation):
  if 'studyType' in case_control:
    if case_control['studyType'] == 'Single variant analysis':
      if 'score' in score:
        if 'case-control-single-count' not in evidence:
          evidence['case-control-single-count'] = 0
        evidence['case-control-single-count'] += 1

        if 'case-control-single-points' not in evidence:
          evidence['case-control-single-points'] = 0
        evidence['case-control-single-points'] += score['score']

      if is_article_new(evidence, 'case-control-single', annotation):
        return (True, 'case-control-single')

    elif case_control['studyType'] == 'Aggregate variant analysis':
      if 'score' in score:
        if 'case-control-aggregate-count' not in evidence:
          evidence['case-control-aggregate-count'] = 0
        evidence['case-control-aggregate-count'] += 1

        if 'case-control-aggregate-points' not in evidence:
          evidence['case-control-aggregate-points'] = 0
        evidence['case-control-aggregate-points'] += score['score']

      if is_article_new(evidence, 'case-control-aggregate', annotation):
        return (True, 'case-control-aggregate')

  return (False, )

# Check if scored experimental evidence should be added to evidence dictionary
def check_experimental_scoring(experimental, score, evidence, annotation):
  experimental_evidence_types = {
    'Biochemical Function': 'exp-biochemical-function',
    'Protein Interactions': 'exp-protein-interactions',
    'Expression': 'exp-expression',
    'Functional Alteration': {
      'Patient cells': 'exp-functional-alteration-patient-cells',
      'Non-patient cells': 'exp-functional-alteration-non-patient-cells'
    },
    'Model Systems': {
      'Non-human model organism': 'exp-model-systems-non-human-model-organism',
      'Cell culture model': 'exp-model-systems-cell-culture-model'
    },
    'Rescue': {
      'Human': 'exp-rescue-human',
      'Non-human model organism': 'exp-rescue-non-human-model-organism',
      'Cell culture model': 'exp-rescue-cell-culture-model',
      'Patient cells': 'exp-rescue-patient-cells'
    }
  }
  evidence_category = None

  if 'scoreStatus' in score:
    if score['scoreStatus'] == 'Score':
      if 'evidenceType' in experimental:
        if experimental['evidenceType'] in experimental_evidence_types:
          if experimental['evidenceType'] == 'Functional Alteration':
            if 'functionalAlteration' in experimental:
              if 'functionalAlterationType' in experimental['functionalAlteration']:
                if experimental['functionalAlteration']['functionalAlterationType'] in experimental_evidence_types['Functional Alteration']:
                  evidence_category = experimental_evidence_types['Functional Alteration'][experimental['functionalAlteration']['functionalAlterationType']]
          elif experimental['evidenceType'] == 'Model Systems':
            if 'modelSystems' in experimental:
              if 'modelSystemsType' in experimental['modelSystems']:
                if experimental['modelSystems']['modelSystemsType'] in experimental_evidence_types['Model Systems']:
                  evidence_category = experimental_evidence_types['Model Systems'][experimental['modelSystems']['modelSystemsType']]

                  if 'exp-model-systems-and-rescue-count' not in evidence:
                    evidence['exp-model-systems-and-rescue-count'] = 0
                  evidence['exp-model-systems-and-rescue-count'] += 1

          elif experimental['evidenceType'] == 'Rescue':
            if 'rescue' in experimental:
              if 'rescueType' in experimental['rescue']:
                if experimental['rescue']['rescueType'] in experimental_evidence_types['Rescue']:
                  evidence_category = experimental_evidence_types['Rescue'][experimental['rescue']['rescueType']]

                  if 'exp-model-systems-and-rescue-count' not in evidence:
                    evidence['exp-model-systems-and-rescue-count'] = 0
                  evidence['exp-model-systems-and-rescue-count'] += 1

          else:
            evidence_category = experimental_evidence_types[experimental['evidenceType']]

      if evidence_category is not None:
        if is_article_new(evidence, evidence_category, annotation):
          return (True, evidence_category)

    elif score['scoreStatus'] == 'Contradicts':
      if is_article_new(evidence, 'contradicts', annotation):
        return (True, 'contradicts')

  return (False, )

# Rerieve article metadata that will be added to evidence dictionary
def save_article(annotation):
  publication = {}

  if 'article' in annotation:
    if 'title' in annotation['article']:
      publication['title'] = annotation['article']['title']

    if 'authors' in annotation['article'] and annotation['article']['authors']:
      publication['author'] = annotation['article']['authors'][0]

    if 'date' in annotation['article'] and isinstance(annotation['article']['date'], str):
      publication['pubdate'] = annotation['article']['date'].split(';', 1)[0]

    if 'journal' in annotation['article']:
      publication['source'] = annotation['article']['journal']

    if 'pmid' in annotation['article']:
      publication['pmid'] = annotation['article']['pmid']

  return publication

# Get individual score data from different objects depends on SOP version
def getIndividualScoreData(templateVersion, individual):
  if templateVersion == 7:
    # SOP7 - get score from scores
    return get_data_by_path(individual, ['scores'], [])
  else:
    # SOP8 - get score from variantScores
    return get_data_by_path(individual, ['variantScores'], [])

# Build evidence dictionary
def gather_evidence(data, user_affiliation, templateVersion):
  evidence_publications = {}

  if not user_affiliation:
    return None

  moiType = get_data_by_path(data, ['modeInheritance'], '')

  annotations = get_data_by_path(data, ['annotations'], [])

  for annotation in annotations:
    groups = get_data_by_path(annotation, ['groups'], [])

    for group in groups:
      families = get_data_by_path(group, ['familyIncluded'], [])

      for family in families:
        individuals = get_data_by_path(family, ['individualIncluded'], [])

        for individual in individuals:
          scores = getIndividualScoreData(templateVersion, individual)

          probandIs = get_data_by_path(individual, ['probandIs'], '')

          for score in scores:
            # print ("score variantType = %s \n" %score.variantType)
            if check_data_ownership(score, user_affiliation):
              individual_score = check_individual_scoring(templateVersion, moiType, probandIs, score, evidence_publications, annotation)

              if individual_score[0]:
                evidence_publications[individual_score[1]].append(save_article(annotation))

        if check_data_ownership(family, user_affiliation):
          segregation_score = check_segregation_scoring(family, evidence_publications, annotation)

          if segregation_score[0]:
            evidence_publications[segregation_score[1]].append(save_article(annotation))

      individuals = get_data_by_path(group, ['individualIncluded'], [])

      for individual in individuals:
        scores = getIndividualScoreData(templateVersion, individual)

        probandIs = get_data_by_path(individual, ['probandIs'], '')

        for score in scores:
          if check_data_ownership(score, user_affiliation):
            individual_score = check_individual_scoring(templateVersion, moiType, probandIs, score, evidence_publications, annotation)

            if individual_score[0]:
              evidence_publications[individual_score[1]].append(save_article(annotation))

    families = get_data_by_path(annotation, ['families'], [])

    for family in families:
      individuals = get_data_by_path(family, ['individualIncluded'], [])

      for individual in individuals:
        scores = getIndividualScoreData(templateVersion, individual)

        probandIs = get_data_by_path(individual, ['probandIs'], '')

        for score in scores:
          if check_data_ownership(score, user_affiliation):
            individual_score = check_individual_scoring(templateVersion, moiType, probandIs, score, evidence_publications, annotation)

            if individual_score[0]:
              evidence_publications[individual_score[1]].append(save_article(annotation))

      if check_data_ownership(family, user_affiliation):
        segregation_score = check_segregation_scoring(family, evidence_publications, annotation)

        if segregation_score[0]:
          evidence_publications[segregation_score[1]].append(save_article(annotation))

    individuals = get_data_by_path(annotation, ['individuals'], [])

    for individual in individuals:
      scores = getIndividualScoreData(templateVersion, individual)

      probandIs = get_data_by_path(individual, ['probandIs'], '')

      for score in scores:
        if check_data_ownership(score, user_affiliation):
          individual_score = check_individual_scoring(templateVersion, moiType, probandIs, score, evidence_publications, annotation)

          if individual_score[0]:
            evidence_publications[individual_score[1]].append(save_article(annotation))

    case_controls = get_data_by_path(annotation, ['caseControlStudies'], [])

    for case_control in case_controls:
      scores = get_data_by_path(case_control, ['scores'], [])

      for score in scores:
        if check_data_ownership(score, user_affiliation):
          case_control_score = check_case_control_scoring(case_control, score, evidence_publications, annotation)

          if case_control_score[0]:
            evidence_publications[case_control_score[1]].append(save_article(annotation))

          break

    experimentals = get_data_by_path(annotation, ['experimentalData'], [])

    for experimental in experimentals:
      scores = get_data_by_path(experimental, ['scores'], [])

      for score in scores:
        if check_data_ownership(score, user_affiliation):
          experimental_score = check_experimental_scoring(experimental, score, evidence_publications, annotation)

          if experimental_score[0]:
            evidence_publications[experimental_score[1]].append(save_article(annotation))

          break

  return evidence_publications

# Build evidence counts dictionary (trimmed from provisional classification points object)
def gather_evidence_counts(points, return_result=False, templateVersion=8):
  keys_to_delete = []

  for key, value in points.items():
    if isinstance(value, (int, float)):
      if templateVersion == 7:
        if 'evidenceCount' not in key or value <= 0:
          keys_to_delete.append(key)
      else:
        if ('evidenceCount' not in key and 'probandCount' not in key) or value <= 0:
          keys_to_delete.append(key)

    elif isinstance(value, dict):
      gather_evidence_counts(value)

      if not points[key]:
        keys_to_delete.append(key)

    else:
      keys_to_delete.append(key)

  # Remove keys with no values
  for key in keys_to_delete:
    del points[key]

  if return_result:
    return points

# SOP8 - Add earliest article data to the message template
def add_earliest_articles(data, template):
  earliestArticles = get_data_by_path(data, ['resource', 'earliestArticles'], {})

  if len(earliestArticles) > 0:
    for article in earliestArticles:
      try:
        if (('PK' in article and article['PK']) and
          ('date' in article and article['date'])):
          print("add article")
          # template is 'EarliestArticles' empty array
          template.append({
            'pmid': article['PK'],
            'year': article['date'][0:4]
          })

      except Exception:
        pass


# Add a yes/no value and all contradictory evidence to the message template
def add_contradictory_evidence(data, evidence, template):
  contradicting_evidence = get_data_by_path(data, ['resource', 'contradictingEvidence'], {})

  if (('proband' in contradicting_evidence and contradicting_evidence['proband']) or
    ('experimental' in contradicting_evidence and contradicting_evidence['experimental']) or
    ('caseControl' in contradicting_evidence and contradicting_evidence['caseControl'])):
    template['Value'] = 'YES'

    if 'contradicts' in evidence:
      template['Evidence'] = {
        'Publications': evidence['contradicts']
      }
  else:
    template['Value'] = 'NO'

# Add a yes/no value for animal model only (AnimalModelOnly) key to the message template
def add_animal_model_only(data, template):
  autoClassification = get_data_by_path(data, ['resource', 'autoClassification'], '')
  classificationPoints = get_data_by_path(data, ['resource', 'classificationPoints'], {})

  # Check if final classification is automatically calculated to "No Known Disease Relationship"
  # and only non-human points are scored in experimental evidence, then Animal Model Only tag is Yes
  if (autoClassification == 'No Known Disease Relationship' and
    classificationPoints['modelsRescue']['modelsNonHuman']['totalPointsGiven'] > 0 and
    classificationPoints['modelsRescue']['modelsNonHuman']['totalPointsGiven'] == classificationPoints['experimentalEvidenceTotal']):
    template['AnimalModelOnly'] = 'YES'
  else:
    template['AnimalModelOnly'] = 'NO'

# Load affiliation data from a JSON file maintained for the UI
def load_affiliation_data():
  global affiliation_data

  if not affiliation_data:
    try:
      affiliation_data = json.load(open(local_file_dir + '/affiliations.json'))

    except Exception:
      pass

# Add dictionary containing secondary contributors/approver to the message template
def add_secondary_contributors_approver(data, template):
  global affiliation_data
  contributors = get_data_by_path(data, ['resource', 'classificationContributors'], [])
  approver = get_data_by_path(data, ['resource', 'additionalApprover'])

  if len(contributors) > 0 or approver:
    load_affiliation_data()
    template['contributors'] = []

  if len(contributors) > 0:
    for affiliation in affiliation_data:
      try:
        if affiliation['affiliation_id'] in contributors:
          template['contributors'].append({
            'id': affiliation['affiliation_id'],
            'name': affiliation['affiliation_fullname'],
            'role': 'secondary contributor'
          })

      except Exception:
        pass

  try:
    template['contributors'].sort(key = lambda contributor: contributor['name'])

  except Exception:
    pass

  if approver:
    for affiliation in affiliation_data:
      try:
        if approver == affiliation['subgroups']['gcep']['id']:
          template['contributors'].append({
            'id': approver,
            'name': affiliation['subgroups']['gcep']['fullname'],
            'role': 'secondary approver'
          })
          break

      except Exception:
        pass

      try:
        if approver == affiliation['subgroups']['vcep']['id']:
          template['contributors'].append({
            'id': approver,
            'name': affiliation['subgroups']['vcep']['fullname'],
            'role': 'secondary approver'
          })
          break

      except Exception:
        pass

# Lookup affiliation data associated with a provided ID
def lookup_affiliation_data(affiliation_id, affiliation_key, affiliation_subgroup=None):
  global affiliation_data
  global saved_affiliation

  if affiliation_id and affiliation_key:
    if not saved_affiliation or 'affiliation_id' not in saved_affiliation or affiliation_id != saved_affiliation['affiliation_id']:
      load_affiliation_data()

      for affiliation in affiliation_data:
        try:
          if affiliation_id == affiliation['affiliation_id']:
            saved_affiliation = affiliation
            break

        except Exception:
          pass

    try:
      if affiliation_subgroup:
        return saved_affiliation['subgroups'][affiliation_subgroup][affiliation_key]
      else:
        return saved_affiliation[affiliation_key]

    except Exception:
      pass

    return None
  else:
    return None

# Traverse message template, performing various data retrieval/update operations
def add_data_to_message_template(data, evidence, evidence_counts, template):
  keep_falsy_data = False
  keys_to_delete = []

  for key, value in template.items():
    if isinstance(value, str):
      if value == '':
        keys_to_delete.append(key)

    elif isinstance(value, list):
      value_length = len(value)

      if value_length > 0:
        # Retrieve data using data path lists
        if value[0] == '$PATH_TO_DATA':
          template[key] = get_data_by_path(data, value[1:])

        # Keep first, non-excluded data found (using data path lists)
        elif value[0] == '$USE_FIRST_DATA':
          if value_length > 2:
            for data_path in value[2:]:
              temp_result = get_data_by_path(data, data_path)

              if temp_result not in {value[1], None}:
                break

            if temp_result != value[1]:
              template[key] = temp_result
            else:
              template[key] = ''
          else:
            template[key] = ''

        # Use one of two provided values, based on data (from a data path list)
        elif value[0] == '$CHECK_FOR_DATA':
          if value_length == 4:
            if get_data_by_path(data, value[1]):
              template[key] = value[2]
            else:
              template[key] = value[3]
          else:
            template[key] = ''

        # Replace data (from a data path list) using the provided strings
        elif value[0] == '$REPLACE_DATA':
          if value_length == 4:
            temp_result = get_data_by_path(data, value[1])

            if isinstance(temp_result, str):
              template[key] = temp_result.replace(value[2], value[3])
            else:
              template[key] = ''
          else:
            template[key] = ''

        # Convert data (from a data path list) using the provided map
        elif value[0] == '$CONVERT_DATA':
          if value_length == 3:
            temp_result = get_data_by_path(data, value[1])
            default_result_key = '$DEFAULT'

            if temp_result in value[2]:
              template[key] = value[2][temp_result]
            elif default_result_key in value[2]:
              template[key] = value[2][default_result_key]
            else:
              template[key] = ''
          else:
            template[key] = ''

        # Combine data (from dictionary of data path lists) with a separator
        elif value[0] == '$COMBINE_DATA':
          if value_length == 3:
            add_data_to_message_template(data, evidence, evidence_counts, value[2])
            template[key] = value[1].join(value[2].values())
          else:
            template[key] = ''

        # Lookup an affiliation name by ID (from a data path list)
        elif value[0] == '$LOOKUP_AFFILIATION_DATA':
          if value_length == 4:
            template[key] = lookup_affiliation_data(get_data_by_path(data, value[1]), value[3], value[2])
          elif value_length == 3:
            template[key] = lookup_affiliation_data(get_data_by_path(data, value[1]), value[2])
          else:
            template[key] = ''

        # Add evidence count (using a data path list)
        elif value[0] == '$EVIDENCE_COUNT':
          if value_length == 2:
            template[key] = get_data_by_path(evidence_counts, value[1])
          else:
            template[key] = ''

        # Add score (using a data path list)
        elif value[0] == '$SCORE_DATA':
          if value_length >= 3:
            template[key] = get_data_by_path(data, value[1])

            # If score is zero, check if it should be included in message (e.g. if evidence count is non-zero)
            if template[key] == 0:
              if value[2] == True:
                keep_falsy_data = True
              else:
                for data_path in value[2:]:
                  if get_data_by_path(evidence_counts, data_path):
                    keep_falsy_data = True
                    break
          else:
            template[key] = ''

        # Add evidence (articles, counts or points) based on information type
        elif value[0] == '$EVIDENCE_DATA':
          if value_length in (2, 3) and value[1] in evidence:
            template[key] = evidence[value[1]]

            if not template[key] and value_length == 3 and value[2] == True:
              keep_falsy_data = True

          else:
            template[key] = ''

        else:
          for element in value:
            if isinstance(element, dict):
              add_data_to_message_template(data, evidence, evidence_counts, element)
      else:
        # If empty list, check for EarliestArticles
        # SOP8 - handling to incorporate earliest articles
        if key == 'EarliestArticles':
          add_earliest_articles(data, value)

      # Save keys with falsy values for later deletion
      if not template[key]:
        if keep_falsy_data:
          keep_falsy_data = False
        else:
          keys_to_delete.append(key)

    elif isinstance(value, dict):
      add_data_to_message_template(data, evidence, evidence_counts, value)

      # Special handling to incorporate contradictory evidence (articles)
      if key == 'ValidContradictoryEvidence':
        add_contradictory_evidence(data, evidence, value)

      # Special handling to incorporate secondary contributors/approver
      elif key == 'summary':
        add_animal_model_only(data, value)
        add_secondary_contributors_approver(data, value)

      if not template[key]:
        keys_to_delete.append(key)

  # Remove keys with no values
  for key in keys_to_delete:
    del template[key]

# Remove unnecessary data from interpretation (before sending it to transformation service)
def remove_data_from_message_template(delete_list, template):
  for data_path in delete_list:
    try:
      data_to_delete = template
      data_to_delete_check = True

      # Subsequent for loop expects a path (list of keys), not a string
      if isinstance(data_path, str):
        data_path = delete_list

      # Check if data exists at specified path (up to second-to-last element)
      for key in data_path[:-1]:
        if key in data_to_delete:
          data_to_delete = data_to_delete[key]
        else:
          data_to_delete_check = False
          break

      if data_to_delete_check:
        # If last path element is a list, expect remaining data to be structured as a list of dictionaries
        if isinstance(data_path[-1], list):
          for element in data_to_delete:
            remove_data_from_message_template(data_path[-1], element)

        elif data_path[-1] in data_to_delete:
          del data_to_delete[data_path[-1]]

    # Continue processing deletion list if/when a single path has problems
    except (IndexError, KeyError):
      pass

# Transform interpretation to SEPIO format (via transformation service)
def transform_interpretation(source_data, use_local):
  # Prepare interpretation to be sent to transformation service
  try:
    source_data_str = json.dumps(source_data, separators=(',', ':'))

  except Exception:
    raise Exception('Failed to build complete message')

  # Send interpretation to transformation service
  try:
    # For now, sending all transformation requests to hosted lambda function (even from app running locally)
    # if use_local:
    #   service_url = 'http://localhost:2999'

    service_url = ''

    transform_result = requests.post('{}/vci2cgsepio'.format(service_url), headers={'Content-Type': 'application/json'}, data=source_data_str, timeout=10)

  except Exception:
    raise Exception('Data transformation service unavailable')

  if transform_result.status_code != requests.codes.ok:
    raise Exception('Data transformation failed')

  # Return result of transformation service as JSON-encoded content
  try:
    return transform_result.json()

  except Exception:
    raise Exception('Result of data transformation not in expected format')

# Generate ClinVar submission data for interpretation (via ClinVar submitter service)
def request_clinvar_data(source_data):
  # Prepare interpretation to be sent to ClinVar submitter service
  try:
    source_data_str = json.dumps(source_data, separators=(',', ':'))

  except Exception:
    raise Exception('Preparation of source data for generation service failed')

  # Send interpretation to ClinVar submitter service
  try:
    service_url = ''
    clinvar_result = requests.post('{}'.format(service_url), headers={'Content-Type': 'application/json'}, data=source_data_str, timeout=10)
  except Exception:
    raise Exception('Data generation service unavailable')

  if clinvar_result.status_code != requests.codes.ok:
    raise Exception('Data generation failed')

  # Return result of ClinVar submitter service as JSON-encoded content
  try:
    print ('ClinVar results %s \n' %clinvar_result.json())
    return clinvar_result.json()

  except Exception:
    raise Exception('Result of data generation not in expected format')

def send_message(message, kafka_topic, use_local, extra_conf=None, message_key=None):
  message_results = { 'status': 'Fail' }

  # Configure common message delivery parameters
  try:
    kafka_cert_pw = os.environ.get('KAFKA_CERT_PW', '')
    kafka_cert_location = local_file_dir + '/certs'
    kafka_timeout = 10

    if use_local:
      kafka_conf = { 'bootstrap.servers': 'localhost:9093',
        'log_level': 0,
        'security.protocol': 'ssl',
        'ssl.key.location': kafka_cert_location + '/local/client.key',
        'ssl.key.password': kafka_cert_pw,
        'ssl.certificate.location': kafka_cert_location + '/local/client.crt',
        'ssl.ca.location': kafka_cert_location + '/local/server.crt' }

    else:
      kafka_conf = { 'bootstrap.servers': 'exchange.clinicalgenome.org:9093',
        'log_level': 0,
        'security.protocol': 'ssl',
        'ssl.key.location': kafka_cert_location + '/dataexchange/client.key',
        'ssl.key.password': kafka_cert_pw,
        'ssl.certificate.location': kafka_cert_location + '/dataexchange/client.crt',
        'ssl.ca.location': kafka_cert_location + '/dataexchange/server.crt' }

    if extra_conf:
      kafka_conf.update(extra_conf)

  except Exception as e:
    message_results['message'] = 'Failed to configure message delivery parameters'
    return message_results

  # Send message
  def delivery_callback(err, msg):
    nonlocal message_results
    if err:
      message_results['message'] = err

    else:
      message_results = { 'status': 'Success',
        'message': message,
        'partition': msg.partition(),
        'offset': msg.offset() }

  try:
    p = Producer(**kafka_conf)

    if message_key:
      p.produce(kafka_topic, message, message_key, callback=delivery_callback)
    else:
      p.produce(kafka_topic, message, callback=delivery_callback)

    p.flush(kafka_timeout)

  except Exception as e:
    message_results['message'] = 'Message delivery failed'

  return message_results
