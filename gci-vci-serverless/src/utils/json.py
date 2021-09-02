import simplejson as json

class SetJSONEncoder(json.JSONEncoder):
  # pylint: disable=locally-disabled, method-hidden
  def default(self, obj):
    if isinstance(obj, set):
      return list(obj)

    return json.JSONEncoder.default(self, obj)
