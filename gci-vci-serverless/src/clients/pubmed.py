import calendar
import os
import requests
import xml.etree.ElementTree as ET

def find(pubmed_id):
  pubmed_search_url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?api_key=&db=PubMed&retmode=xml&id='
  
  try:
    res = requests.get(pubmed_search_url + pubmed_id, timeout=60)
  except Exception as e:
    print('ERROR: Pubmed Request error: %s' %e)
    raise
  else:
    if res.status_code == requests.codes['ok']:
      return deserialize(res.text)
    else:
      res.raise_for_status

def deserialize(xml):
  """ Deserializes a Pubmed response into an article object."""

  article = {}
  
  root = ET.fromstring(xml)
  
  article_el = root.find('.//PubmedArticle')
  if article_el is None:
    print('INFO: XML did not contain a Pubmed Article.')
    return None

  pmid_el = article_el.find('.//MedlineCitation/PMID')
  if pmid_el is not None:
    article['pmid'] = pmid_el = pmid_el.text

  # Work on parsing on 
  date_published = None

  journal_el = article_el.find('.//MedlineCitation/Article/Journal')
  if journal_el is not None:
    # First try and get the published date from the journel element.
    journal_date_el = journal_el.find('.//JournalIssue/PubDate')
    journal_date_published = _deserialize_date_published(journal_date_el)

    date_published = journal_date_published
    
  if date_published is None or len(date_published) < 5:
    # If the journal date doesn't exist or is too short, try and get
    # the date published from the article date element.
    article_el_date = article_el.find('.//MedlineCitation/Article/ArticleDate')
    article_date_published = _deserialize_date_published(article_el_date)

    # If we have an article date published and it's length is longer than the journal
    # date use it.
    if article_date_published is not None:
      if date_published is None or len(article_date_published) > len(date_published):
        date_published = article_date_published

  # If we still don't have a date published fall back to the MedlineDate element.
  if date_published is None:
    medline_date_el = article_el.find('.//MedlineCitation/Article/Journal/JournalIssue/PubDate/MedlineDate')
    if medline_date_el is not None:
      date_published = medline_date_el.text

  article['date'] = date_published if date_published is not None else ''

  if journal_el is not None:
    # Jounal Title
    journal_title_el = journal_el.find('.//Title')
    if journal_title_el is not None:
      journal_title = journal_title_el.text.rstrip('.')
    else:
      journal_title = ''

    article['journal'] = journal_title

    # Issue, Volume, Periodical
    volume_el = journal_el.find('.//Volume')
    publication_data = volume_el.text if volume_el is not None else ''

    issue_el = journal_el.find('.//Issue')
    publication_data = publication_data + '(' + issue_el.text + ')' if issue_el is not None else publication_data
    
    pagination_el = article_el.find('.//MedlineCitation/Article/Pagination/MedlinePgn')
    publication_data = publication_data + ':' + pagination_el.text if pagination_el is not None else publication_date
    
    if len(publication_data) > 0:
      article['date'] = article['date'] + ';' + publication_data + '.'
    else:
      article['date'] = article['date'] + '.'
    
  # Try and parse jounal authors.
  article['authors'] = _deserialize_authors(article_el.find('.//MedlineCitation/Article/AuthorList'))

  # Parse title.
  article_title_el = article_el.find('.//MedlineCitation/Article/ArticleTitle')
  if article_title_el is not None:
    article['title'] = article_title_el.text

  # Parse abstract.
  abstract_text_el = article_el.find('.//MedlineCitation/Article/Abstract/AbstractText')
  if abstract_text_el is not None:
    article['abstract'] = abstract_text_el.text
  else:
    article['abstract'] = ''

  return article

def _deserialize_authors(author_list_el):
  if author_list_el is None:
    return []

  authors = []
  for author_el in author_list_el.findall('.//Author'):
    collective_name_el = author_el.find('.//CollectiveName')
    if collective_name_el is not None:
      author_name = collective_name_el.text
    else:
      author_name_comps = []
      
      last_name_el = author_el.find('.//LastName')
      if last_name_el is not None:
        author_name_comps.append(last_name_el.text)
      
      initials_name_el = author_el.find('.//Initials')
      if initials_name_el is not None:
        author_name_comps.append(initials_name_el.text)
      
      author_name = ' '.join(author_name_comps)
    
    authors.append(author_name)

  return authors

def _deserialize_date_published(pub_date_el):
  if pub_date_el is None:
    return None

  comps = []
  
  year_el = pub_date_el.find('.//Year')
  if year_el is not None:
    year_text = year_el.text.strip()
    
    if len(year_text) > 0:
      comps.append(year_text)

  month_el = pub_date_el.find('.//Month')
  if month_el is not None:
    month_text = month_el.text.strip()
    if month_text.isdigit():
      month_text = calendar.month_abbr[int(month_text) % 13]

    if len(month_text) > 0:
      comps.append(month_text)

  day_el = pub_date_el.find('.//Day')
  if day_el is not None:
    day_text = day_el.text.strip().lstrip('0')
  
    if len(day_text) > 0:
      comps.append(day_text)

  if len(comps) > 0:
    return ' '.join(comps)
  else:
    return None
