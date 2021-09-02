import pytest

from src.db.ddb_client import ExpressionAttributeNamesBuilder

def test_builds_attribute_names():
  test_builder = ExpressionAttributeNamesBuilder()
  test_builder.append_attribute_name('foo')
  test_builder.append_attribute_name('bar')

  act_attr_names = test_builder.build_attribute_names()
  assert act_attr_names == { '#foo': 'foo', '#bar': 'bar' }, 'Expression attribute names do not match'
