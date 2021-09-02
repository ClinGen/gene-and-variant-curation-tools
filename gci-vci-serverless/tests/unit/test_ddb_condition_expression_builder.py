import pytest

from src.db.ddb_client import ConditionExpressionBuilder

def test_builds_not_equal_expression():
  test_builder = ConditionExpressionBuilder()
  test_builder.not_equal('foo')

  act_expression = test_builder.build_expression()
  assert act_expression == '#foo <> :foo', 'Not Equal expression does not match'

def test_builds_attribute_not_exists_expression():
  test_builder = ConditionExpressionBuilder()
  test_builder.attribute_not_exists('foo')
  
  act_expression = test_builder.build_expression()
  assert act_expression == 'attribute_not_exists(foo)'

def test_builds_multiple_condition_expression():
  test_builder = ConditionExpressionBuilder()
  test_builder.attribute_not_exists('foo')
  test_builder.not_equal('foo')

  act_expression = test_builder.build_expression()
  assert act_expression == 'attribute_not_exists(foo) AND #foo <> :foo'