import pytest

from src.db.ddb_client import UpdateExpressionBuilder

def test_builds_set_expression():
  test_builder = UpdateExpressionBuilder()
  test_builder.append_set('foo')
  test_builder.append_set('bar')
  
  act_expression = test_builder.build_expression()
  assert act_expression == 'SET #foo = :foo, #bar = :bar'

def test_builds_remove_expression():
  test_builder = UpdateExpressionBuilder()
  test_builder.append_remove('foo')
  test_builder.append_remove('bar')
  
  act_expression = test_builder.build_expression()
  assert act_expression == 'REMOVE #foo, #bar'

def test_builds_multiple_action_expression():
  test_builder = UpdateExpressionBuilder()
  test_builder.append_set('foo')
  test_builder.append_set('bar')
  test_builder.append_remove('foobar')
  
  act_expression = test_builder.build_expression()
  assert act_expression == 'SET #foo = :foo, #bar = :bar REMOVE #foobar'
