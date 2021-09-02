export const findDiffKeyValues = (newObj, oldObj) => {
  let tempReturn = [],
    diffObj = {},
    diffObjFlag = false; // default diffObjFlag to false: no difference
  for (let key in newObj) {
    // use for loop to support both arrays and objects
    if (['boolean', 'number', 'string'].indexOf(typeof newObj[key]) > -1) {
      // if value stored in key is a boolean, number, or string, do a comparison
      if (newObj[key] === oldObj[key]) {
        // no difference
        diffObj[key] = false;
      } else {
        // difference found. set diffObjFlag to true, as well
        diffObj[key] = true;
        diffObjFlag = true;
      }
    } else {
      // if it's an array or object, recurse
      tempReturn = findDiffKeyValues(newObj[key], oldObj[key]);
      diffObj[key] = tempReturn[0];
      diffObjFlag = diffObjFlag ? true : tempReturn[1]; // if the diffObjFlag was previously set to true, always set to true. Otherwise use the returned value
    }
  }
  return [diffObj, diffObjFlag];
}