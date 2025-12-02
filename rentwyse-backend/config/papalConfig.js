// paypalConfig.js
const checkoutNodeJssdk = require("@paypal/checkout-server-sdk");
const dotenv = require("dotenv");

dotenv.config({ path: ".env" });

function environment() {
  let clientId = process.env.PAYPAL_CLIENT_ID;
  let clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  return new checkoutNodeJssdk.core.SandboxEnvironment(clientId, clientSecret);
}

function paypalClient() {
  return new checkoutNodeJssdk.core.PayPalHttpClient(environment());
}

module.exports = { paypalClient };
