
export const individualScraper = (individuals, individualMatched) => {
  if (individuals) {
      individuals.forEach(individual => {
          if (individual.proband === true && (individual.variantScores && individual.variantScores.length)) {
              individualMatched.push(individual);
          }
      });
  }
  return individualMatched;
};

export const familyScraper = (user, families, curatorAffiliation, annotation, segregationCountCandidate, segregationCountExome, segregationPointsCandidate, segregationPointsExome, individualMatched) => {
  // function for looping through family (of GDM or of group) and finding all relevent information needed for score calculations
  // returns dictionary of relevant items that need to be updated within NewCalculation()
  families.forEach(family => {
      // get segregation of family, but only if it was made by user (may change later - MC)
      if ((family.affiliation && curatorAffiliation && family.segregation && family.affiliation === curatorAffiliation)
          || (!family.affiliation && !curatorAffiliation && family.segregation && family.submitted_by.PK === user)) {
          // get lod score of segregation of family
          if (family.segregation.includeLodScoreInAggregateCalculation) {
              if ("lodPublished" in family.segregation && family.segregation.lodPublished === true && family.segregation.publishedLodScore) {
                  if (family.segregation.sequencingMethod === 'Candidate gene sequencing') {
                      segregationCountCandidate += 1;
                      segregationPointsCandidate += family.segregation.publishedLodScore;
                  } else if (family.segregation.sequencingMethod === 'Exome/genome or all genes sequenced in linkage region') {
                      segregationCountExome += 1;
                      segregationPointsExome += family.segregation.publishedLodScore;
                  }
              } else if ("lodPublished" in family.segregation && family.segregation.lodPublished === false && family.segregation.estimatedLodScore) {
                  if (family.segregation.sequencingMethod === 'Candidate gene sequencing') {
                      segregationCountCandidate += 1;
                      segregationPointsCandidate += family.segregation.estimatedLodScore;
                  } else if (family.segregation.sequencingMethod === 'Exome/genome or all genes sequenced in linkage region') {
                      segregationCountExome += 1;
                      segregationPointsExome += family.segregation.estimatedLodScore;
                  }
              }
          }
      }
      // get proband individuals of family
      if (family.individualIncluded && family.individualIncluded.length) {
          individualMatched = individualScraper(family.individualIncluded, individualMatched);
      }
  });

  return {
      segregationCountCandidate: segregationCountCandidate,
      segregationCountExome: segregationCountExome,
      segregationPointsCandidate: segregationPointsCandidate,
      segregationPointsExome: segregationPointsExome,
      individualMatched: individualMatched
  };
};
