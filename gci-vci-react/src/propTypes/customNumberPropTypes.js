/**
 * This method can be used in a prop of your component's propTypes and validate a number by range.
 * @param {Object} range
 * @param {number?} range.start - Set a minimum allowed value (included). Optional.
 * @param {number?} range.end - Set a maximum allowed value (included). Optional.
 */
export const NumberPropTypes = ({start, end}) => {
  return (props, propName, componentName) => {
    const value = props[propName];
    if (typeof value !== 'number') {
      return;
    }
    
    if (start !== undefined && start !== null) {
      if (end !== undefined && end !== null) {
        if (value < start || value > end) {
          return new Error(`${propName} in ${componentName} is ${value}, but should be within ${start} to ${end}`);
        }
      } else {
        if (value < start) {
          return new Error(`${propName} in ${componentName} is ${value}, but should be ${start} or larger`);
        }
      }
    } else {
      if (value > end) {
        return new Error(`${propName} in ${componentName} is ${value}, but should be ${end} or smaller`);
      }
    }
  }
}
