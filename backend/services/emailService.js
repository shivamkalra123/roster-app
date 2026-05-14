// backend/services/emailService.js
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Use the same environment variables consistently
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL,      // Changed from EMAIL_USER to EMAIL
        pass: process.env.PASSWORD,
      },
    });
  }

  async sendTeamInvitation(email, teamName, inviterName, teamId, inviteToken) {
    const inviteLink = `${process.env.FRONTEND_URL}/accept-invite?token=${inviteToken}&teamId=${teamId}`;
    
    const mailOptions = {
      from: `"Team Roster" <${process.env.EMAIL}>`,  // Use EMAIL here too
      to: email,
      subject: `You've been invited to join ${teamName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Team Invitation</h2>
          <p>Hello,</p>
          <p><strong>${inviterName}</strong> has invited you to join the team <strong>${teamName}</strong> on the Roster Management System.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">What you'll get:</h3>
            <ul>
              <li>View your shift schedule</li>
              <li>Set shift preferences</li>
              <li>Request time off</li>
              <li>Receive roster notifications</li>
            </ul>
          </div>
          
          <a href="${inviteLink}" 
             style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Accept Invitation
          </a>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            If you don't have an account yet, you'll be prompted to create one.<br>
            This invitation will expire in 7 days.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            If you didn't expect this invitation, you can ignore this email.
          </p>
        </div>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Invitation sent to ${email}, Message ID: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('❌ Email send error:', error.message);
      return false;
    }
  }

  async sendWelcomeEmail(email, name, teamName) {
    const mailOptions = {
      from: `"Team Roster" <${process.env.EMAIL}>`,
      to: email,
      subject: `Welcome to ${teamName}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome to the Team!</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>You have successfully joined <strong>${teamName}</strong> on the Roster Management System.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Getting Started:</h3>
            <ol>
              <li>Log in to your account</li>
              <li>Set your shift preferences</li>
              <li>Mark any planned leaves</li>
              <li>View your upcoming roster</li>
            </ol>
          </div>
          
          <a href="${process.env.FRONTEND_URL}/login" 
             style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Go to Dashboard
          </a>
          
          <p style="color: #6b7280; font-size: 14px;">
            If you have any questions, please contact your team administrator.
          </p>
        </div>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email sent to ${email}, Message ID: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('❌ Welcome email error:', error.message);
      return false;
    }
  }
}

module.exports = new EmailService();