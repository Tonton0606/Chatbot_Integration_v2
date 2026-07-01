const crypto = require("crypto");

function createFacebookWebhookSecurity({ getFacebookConfig }) {
  if (typeof getFacebookConfig !== "function") {
    throw new Error(
      "getFacebookConfig is required for facebookWebhookSecurity service."
    );
  }

  async function verifyFacebookSignature(req) {
    // x-bypass-signature removed — signature is verified in ALL environments.
    // In local dev, use ngrok to receive real Meta webhooks with real signatures.
    const config = await getFacebookConfig();
    const appSecret = config.appSecret;

    if (!appSecret) {
      // No app secret configured — log and reject. Never allow unsigned webhooks.
      return false;
    }

    const signature = req.headers["x-hub-signature-256"];

    if (!signature || !req.rawBody) {
      return false;
    }

    const expected = `sha256=${crypto
      .createHmac("sha256", appSecret)
      .update(req.rawBody)
      .digest("hex")}`;

    if (Buffer.from(signature).length !== Buffer.from(expected).length) {
      return false;
    }

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
      );
    } catch {
      return false;
    }
  }

  return {
    verifyFacebookSignature,
  };
}

module.exports = {
  createFacebookWebhookSecurity,
};
