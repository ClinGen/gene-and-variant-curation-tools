// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';

// part of this file is from https://github.com/ClinGen/clincoded/blob/dev/src/clincoded/static/components/affiliation/affiliations.json
// IMPORTANT: if a change is made to the above link (such as a new affiliation is added), this file will need to be updated manually and
// the UI application will need to be redeployed

const affiliationsList =
[
  {
      "affiliation_id": "10001",
      "affiliation_fullname": "Cardiovascular KCNQ1 EP",
      "publish_approval": true,
      "approver": [
          "Lisa Kurtz",
          "Michael Gollob"
      ]
  },
  {
      "affiliation_id": "10002",
      "affiliation_fullname": "Cardiovascular Cardiomyopathy EP",
      "publish_approval": true,
      "approver": [
          "Birgit Funke",
          "Lisa Kurtz",
          "Melissa Kelly"
      ]
  },
  {
      "affiliation_id": "10003",
      "affiliation_fullname": "Cardiovascular Dilated Cardiomyopathy EP",
      "publish_approval": true,
      "approver": [
          "Cindy James",
          "Jan Jongbloed",
          "Lisa Kurtz",
          "Peter van Tintelen",
          "Ray Hershberger"
      ]
  },
  {
      "affiliation_id": "10004",
      "affiliation_fullname": "Cardiovascular Familial Hypercholesterolemia EP",
      "publish_approval": true,
      "approver": [
          "Lisa Kurtz",
          "Mafalda Bourbon"
      ]
  },
  {
      "affiliation_id": "10005",
      "affiliation_fullname": "Epilepsy EP",
      "publish_approval": true
  },
  {
      "affiliation_id": "10006",
      "affiliation_fullname": "Autism and Intellectual Disability EP",
      "publish_approval": true
  },
  {
      "affiliation_id": "10007",
      "affiliation_fullname": "Hearing Loss EP",
      "publish_approval": true,
      "approver": [
          "Ahmad Tayoun",
          "Heidi Rehm",
          "Sami Amr"
      ]
  },
  {
      "affiliation_id": "10008",
      "affiliation_fullname": "Hypertrophic Cardiomyopathy EP",
      "publish_approval": true,
      "approver": [
          "Courtney Thaxton",
          "Jen McGlaughon",
          "Jenny Goldstein"
      ]
  },
  {
      "affiliation_id": "10009",
      "affiliation_fullname": "Storage Diseases EP",
      "publish_approval": true
  },
  {
      "affiliation_id": "10010",
      "affiliation_fullname": "Fatty Acid Oxidation Disorders EP",
      "publish_approval": true,
      "approver": [
          "Heather Baudet",
          "Jen McGlaughon"
      ]
  },
  {
      "affiliation_id": "10011",
      "affiliation_fullname": "Aminoacidopathy EP",
      "publish_approval": true
  },
  {
      "affiliation_id": "10012",
      "affiliation_fullname": "PTEN EP",
      "publish_approval": true,
      "approver": [
          "Jessica Mester"
      ]
  },
  {
      "affiliation_id": "10013",
      "affiliation_fullname": "TP53 EP",
      "publish_approval": true,
      "approver": [
          "Jessica Mester",
          "Kristy Lee",
          "Tina Pesaran"
      ]
  },
  {
      "affiliation_id": "10014",
      "affiliation_fullname": "CDH1 EP",
      "publish_approval": true,
      "approver": [
          "Intan Schrader",
          "Kristy Lee",
          "Rachid Karam",
          "Tina Pesaran",
          "Xi Luo"
      ]
  },
  {
      "affiliation_id": "10015",
      "affiliation_fullname": "PAH EP",
      "publish_approval": true,
      "approver": [
          "Amanda Thomas",
          "Diane Zastrow"
      ]
  },
  {
      "affiliation_id": "10016",
      "affiliation_fullname": "Monogenic Diabetes EP",
      "publish_approval": true,
      "approver": [
          "Kristin Maloney",
          "Linda Jeng",
          "Toni Pollin"
      ]
  },
  {
      "affiliation_id": "10017",
      "affiliation_fullname": "Sequence Variant Discrepancy Resolution",
      "publish_approval": true
  },
  {
      "affiliation_id": "10018",
      "affiliation_fullname": "UNC Biocuration Core",
      "publish_approval": true,
      "approver": [
          "Courtney Thaxton",
          "Jen McGlaughon",
          "Jenny Goldstein"
      ]
  },
  {
      "affiliation_id": "10019",
      "affiliation_fullname": "Harvard/Geisinger Biocuration Core",
      "publish_approval": true
  },
  {
      "affiliation_id": "10020",
      "affiliation_fullname": "Brain Malformations EP",
      "publish_approval": true,
      "approver": [
          "Annapurna Poduri",
          "Tim Yu"
      ]
  },
  {
      "affiliation_id": "10021",
      "affiliation_fullname": "RASopathy EP",
      "publish_approval": true
  },
  {
      "affiliation_id": "10022",
      "affiliation_fullname": "Rett Angelman EP",
      "publish_approval": true
  },
  {
      "affiliation_id": "10023",
      "affiliation_fullname": "Hereditary Cancer EP",
      "publish_approval": true,
      "approver": [
          "Sharon Plon"
      ]
  },
  {
      "affiliation_id": "10024",
      "affiliation_fullname": "BCM Education",
      "approver": [
          "Deb Ritter"
      ]
  },
  {
      "affiliation_id": "10025",
      "affiliation_fullname": "Cardiovascular LQTS EP",
      "publish_approval": true,
      "approver": [
          "Amy Sturm",
          "Arthur Wilde",
          "Lisa Kurtz",
          "Melanie Care",
          "Michael Gollob",
          "Valeria Novelli"
      ]
  },
  {
      "affiliation_id": "10026",
      "affiliation_fullname": "General Gene Curation EP",
      "publish_approval": true,
      "approver": [
          "Christa Martin",
          "Heidi Rehm",
          "Jonathan Berg",
          "Ozge Birsoy",
          "Sharon Plon"
      ]
  },
  {
      "affiliation_id": "10027",
      "affiliation_fullname": "Mitochondrial Diseases EP",
      "publish_approval": true
  },
  {
      "affiliation_id": "10028",
      "affiliation_fullname": "Hemostatis/Thrombosis EP",
      "publish_approval": true
  },
  {
      "affiliation_id": "10029",
      "affiliation_fullname": "Broad Institute Rare Disease Group",
      "approver": [
          "Samantha Baxter"
      ]
  },
  {
      "affiliation_id": "10031",
      "affiliation_fullname": "Congenital Myopathies EP",
      "publish_approval": true,
      "approver": [
          "Ozge Birsoy"
      ]
  },
  {
      "affiliation_id": "10032",
      "affiliation_fullname": "Stanford Center for Inherited Cardiovascular Disease"
  }
];

const affiliationIdToNameMap = _.keyBy(affiliationsList, 'affiliation_id');

export {
  affiliationsList,
  affiliationIdToNameMap,
};
