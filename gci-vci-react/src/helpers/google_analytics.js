
/* Global site tag template for Google Analytics (as of October 2021)
<script async src="https://www.googletagmanager.com/gtag/js?id=[Tracking ID]"></script>

<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '[Tracking ID]');
</script>
*/

/**
 * Method to add Google Analytics (global site tag) to the app
 */
export function addGoogleAnalytics() {
  if (document && document.head) {
    let gaCode = document.getElementById('ga-embed-code');

    // Add GA global site tag code to HTML document only once
    if (!gaCode) {
      const gaTrackingIDs = {
        'prod': '',
        'test': '',
        'other': ''
      };

      let gaTrackingID = gaTrackingIDs['other'];

      if (document.location) {
        if (/^curation\.clinicalgenome\.org$/.test(document.location.hostname)) {
          gaTrackingID = gaTrackingIDs['prod'];
        } else if (/^curation\-test\.clinicalgenome\.org$/.test(document.location.hostname)) {
          gaTrackingID = gaTrackingIDs['test'];
        }
      }

      // Build script tags/nodes that will be appended to HTML document
      let gaLibraryScript = document.createElement('script');
      let gaConfigScript = document.createElement('script');

      gaLibraryScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + gaTrackingID;
      gaLibraryScript.async = true;

      gaConfigScript.id = 'ga-embed-code';
      gaConfigScript.textContent = "window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '" + gaTrackingID + "');"

      document.head.appendChild(gaLibraryScript);
      document.head.appendChild(gaConfigScript);
    }
  }

  return;
}
