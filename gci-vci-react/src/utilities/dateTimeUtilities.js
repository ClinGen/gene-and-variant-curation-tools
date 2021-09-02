import * as momentTz from 'moment-timezone';

const timezone = momentTz.tz.guess(true);
const timeZoneAbbr = momentTz.tz(timezone).zoneAbbr();

/**
 * 
 * @param {string} isoTimeString - String like "date_created" or "last_modified" on the object
 * @param {string} format - Custom format param, examples of diff formats here: https://momentjs.com/
 * @param {boolean} showTimezone - Boolean value for display of time zone
 */
export const getFormattedDateTime = (isoTimeString, format, showTimezone) => {
  return momentTz.utc(isoTimeString).local().format(format) + `${showTimezone ? ` ${timeZoneAbbr}` : ''}`;
}
