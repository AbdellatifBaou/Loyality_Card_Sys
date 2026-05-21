const https = require('https');

const options = {
  hostname: 'api.stripe.com',
  port: 443,
  path: '/v1/events/evt_1TZR3LDsQOIvzkhSeFMDgmsC',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer sk_live_HIER_DEINEN_LIVE_SECRET_KEY_EINTRAGEN' // No, I need the actual Coolify env key...
  }
};
