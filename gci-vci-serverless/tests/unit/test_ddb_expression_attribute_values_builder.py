import pytest

from src.db.ddb_client import ExpressionAttributeValuesBuilder

def test_builds_attribute_names():
  test_builder = ExpressionAttributeValuesBuilder()
  test_builder.append_attribute('example', 'value')
  test_builder.append_attribute('foo', 'bar')

  act_attr_values = test_builder.build_attribute_values()
  assert act_attr_values == { ':foo': { 'S': 'bar' }, ':example': { 'S': 'value' } }, 'Expression attribute values do not match'
