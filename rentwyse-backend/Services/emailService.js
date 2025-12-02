// Services/emailService.js
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");

dotenv.config({ path: ".env" });

class EmailService {
  constructor() {
    const OAuth2 = google.auth.OAuth2;

    // Check if all required env vars are present
    this.enabled =
      !!process.env.GOOGLE_CLIENT_ID &&
      !!process.env.GOOGLE_CLIENT_SECRET &&
      !!process.env.GOOGLE_REFRESH_TOKEN &&
      !!process.env.EMAIL_USERNAME;

    if (!this.enabled) {
      console.warn(
        "EmailService: Gmail OAuth env vars missing. Email sending is disabled (dev mode)."
      );
      return;
    }

    this.oauth2Client = new OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground" // Redirect URL
    );

    this.oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.EMAIL_USERNAME,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
        // accessToken will be provided at send time, not here
      },
    });
  }

  async sendVerificationEmail(userEmail, verificationToken) {
    // Dev fallback: if not configured, just log and return
    if (!this.enabled) {
      console.log(
        `DEV MODE: pretend to send verification email to ${userEmail} with token ${verificationToken}`
      );
      return;
    }

    const verificationUrl = `http://localhost:5500/api/user/verify-email?token=${verificationToken}`;

    try {
      // Get a fresh access token each time
      const { token: accessToken } = await this.oauth2Client.getAccessToken();

      const mailOptions = {
        from: '"Rent-Wyse" <noreply@rentwyse.com>',
        to: userEmail,
        subject: "Rent-Wyse Email Verification",
        html: `Please click this link to confirm your email address: <a href="${verificationUrl}">${verificationUrl}</a>`,
        auth: {
          user: process.env.EMAIL_USERNAME,
          refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
          accessToken,
        },
      };

      await this.transporter.sendMail(mailOptions);
      console.log("Verification email sent successfully");
    } catch (error) {
      console.error("Failed to send verification email", error);
      // Don't rethrow so it doesn't crash the request
    }
  }
}

module.exports = new EmailService();
