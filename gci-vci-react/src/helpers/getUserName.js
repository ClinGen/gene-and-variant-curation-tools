import lodashGet from "lodash/get";

/**
 * Method to return the user name or email to be displayed given the user object 
 * @param {object} userObj - User object
 */
export function getUserName(userObj) {
  const name = lodashGet(userObj, "name", null) && lodashGet(userObj, "family_name", null)
      ? `${lodashGet(userObj, "name", null)} ${lodashGet(userObj, "family_name", null)}`
      : (lodashGet(userObj, "email", null) ? lodashGet(userObj, "email", null) : '');

  return (name);
}

