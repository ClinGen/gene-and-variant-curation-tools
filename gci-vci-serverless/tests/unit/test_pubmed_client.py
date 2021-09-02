import src.clients.pubmed as test_client

import json
import os
import pytest

@pytest.fixture(scope='module')
def article_xml():
  f_name = 'tests/data/article_55555.xml'
  with open(f_name) as xml_f:
    xml_s = xml_f.read()

  return xml_s

@pytest.fixture(scope='module')
def article_with_abstract_xml():
  f_name = 'tests/data/article_44444.xml'
  with open(f_name) as xml_f:
    xml_s = xml_f.read()

  return xml_s

@pytest.fixture(scope='module')
def article_with_full_date_published_xml():
  f_name = 'tests/data/article_55555.xml'
  with open(f_name) as xml_f:
    xml_s = xml_f.read()

  return xml_s

@pytest.fixture(scope='module')
def article_with_partial_date_published_xml():
  f_name = 'tests/data/article_44444.xml'
  with open(f_name) as xml_f:
    xml_s = xml_f.read()

  return xml_s

@pytest.fixture(scope='module')
def article_with_multiple_authors_xml():
  f_name = 'tests/data/article_44444.xml'
  with open(f_name) as xml_f:
    xml_s = xml_f.read()

  return xml_s

def test_find_returns_article():
  # Valid article ID at the time of writing this test.
  article = test_client.find('44444')

  # Assert the article ids match. Other tests get into
  # more detail.
  assert article['pmid'] == '44444'

def test_find_invalid_id_returns_none():
  # Look for a ID we know is most likely invalid.
  article = test_client.find('8000000000000')
  assert article is None

def test_deserializes_pmid(article_xml):
  article = test_client.deserialize(article_xml)
  assert article['pmid'] == '55555', 'Article pubmedId does not match.'

def test_deserializes_date_published(article_with_full_date_published_xml):
  article = test_client.deserialize(article_with_full_date_published_xml)
  assert article['date'] == '1976 Jan 31;1(7953):249.', 'Article full date does not match'

def test_deserializes_partial_date_published(article_with_partial_date_published_xml):
  article = test_client.deserialize(article_with_partial_date_published_xml)
  assert article['date'] == "1979 Nov;38(5):827-30.", 'Article partial date does not match'

def test_deserializes_journal_title(article_xml):
  article = test_client.deserialize(article_xml)
  assert article['journal'] == "Lancet (London, England)", 'Article journal title does not match'

def test_deserializes_authors(article_xml):
  article = test_client.deserialize(article_xml)
  assert article['authors'] == [ "Wigglesworth JS" ], 'Article authors does not math'
  
def test_deserializes_multiple_authors(article_with_multiple_authors_xml):
  article = test_client.deserialize(article_with_multiple_authors_xml)
  exp_authors = [ "Merkal RS", "Crawford JA" ]
  assert article['authors'] == exp_authors, 'Article multiple authors does not math'

def test_deserialize_title(article_xml):
  article = test_client.deserialize(article_xml)
  assert article['title'] == "Letter: Buffer therapy and intraventricular haemorrhage.", 'Article title does not match'

def test_deserialize_abstract(article_with_abstract_xml):
  article = test_client.deserialize(article_with_abstract_xml)

  exp_abstract = "Isolants from swine and from humans representing serotypes 1, 2, 4, 8, and 10 of the Mycobacterium avium-Mycobacterium intracellulare complex were compared for heat tolerance in aqueous suspension. The most heat-resistant isolant found was a serovar 10 isolated from a human. This isolant was examined further to determine the rate of kill at various temperatures and pH's, the effect of meat protein and fat, and the effect of nitrite. Kill rates were not significant at 60 degrees C or below. Decimal reduction values were 4 min or less at 65 degrees C and 1.5 min or less at 70 degrees C. Kill rates were slightly higher at pH values of 6.5 and 7.0 than at 5.5 or 6.0. the water-soluble fraction of wiener emulsion did not alter kill rates, but the saline-soluble fraction protected the organism somewhat. Fat did not affect the survival of the organisms except to eliminate the protective effect of saline extract when the suspension contained 50% fat. The addition of sodium nitrite to the suspension did not alter the heat sensitivity of the organisms."
  assert article['abstract'] == exp_abstract, 'Article abstract does not match'