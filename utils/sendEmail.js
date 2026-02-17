import Brevo from "@getbrevo/brevo";

const apiInstance = new Brevo.TransactionalEmailsApi();

// Set the API Key (Use your xkeysib-... key here)
apiInstance.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

/**
 * Sends a Transactional Email via Brevo API (No SMTP)
 * @param {Object} options - { email, subject, html }
 */
export const sendEmail = async (options) => {
  try {
    const sendSmtpEmail = new Brevo.SendSmtpEmail();

    sendSmtpEmail.subject = options.subject;
    sendSmtpEmail.htmlContent = options.html;
    // Ensure this matches your Verified Sender in Brevo Dashboard
    sendSmtpEmail.sender = { email: "toonlord981@gmail.com", name: "ToonLord" };
    sendSmtpEmail.to = [{ email: options.email }];

    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("✅ API Delivery Success. ID:", response.body.messageId);
    return { success: true, messageId: response.body.messageId };
  } catch (error) {
    // Detailed logging for debugging 400 errors
    console.error("❌ Brevo API Error:", error.response?.body || error.message);
    return { success: false, error: error.message };
  }
};