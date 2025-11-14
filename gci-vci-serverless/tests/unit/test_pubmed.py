"""Test the code that parses PubMed article XML."""

from xml.etree import ElementTree as ET
from src.clients import pubmed
import os


GCI_VCI_AWS_ROOT_DIR = os.environ.get("GCI_VCI_AWS_ROOT")


def test_can_tell_if_preprint():
    """We need to know if an article is from a pre-print server."""
    with open(f"{GCI_VCI_AWS_ROOT_DIR}/gci-vci-serverless/tests/data/article_32511378.xml") as preprint_file:
        preprint_root_el = ET.fromstring(preprint_file.read())
    preprint_article_el = preprint_root_el.find(".//PubmedArticle")
    assert pubmed.is_preprint(preprint_article_el) is True


def test_can_tell_if_not_preprint():
    """We need to know if an article is not from a pre-print server."""
    with open(f"{GCI_VCI_AWS_ROOT_DIR}/gci-vci-serverless/tests/data/article_44444.xml") as regular_file:
        regular_root_el = ET.fromstring(regular_file.read())
    regular_article_el = regular_root_el.find(".//PubmedArticle")
    assert pubmed.is_preprint(regular_article_el) is False
