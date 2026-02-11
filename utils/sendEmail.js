import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS 
    }
});

// Verify connection on startup
transporter.verify((error) => {
    if (error) {
        console.error('❌ Mailer Configuration Error:', error);
    } else {
        console.log('✅ Mail Server Ready');
    }
});

/**
 * Sends an OTP email to the user
 * @param {string} userEmail - Recipient's email
 * @param {string|number} otp - The generated code
 */
export const sendEmail = async (userEmail, otp) => {
    const mailOptions = {
        from: `"ToonLord" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: 'Verification Code',
        text: `Your OTP is ${otp}. It expires in 5 minutes.`,
        html: `
        <div style="font-family: sans-serif; text-align: center; border: 1px solid #eee; padding: 20px;">
            <h2>Verify Your Account</h2>
            <p>Your One-Time Password (OTP) is:</p>
            <h1 style="color: #4A90E2; font-size: 40px; letter-spacing: 5px;">${otp}</h1>
            <p style="color: #666;">This code will expire in 5 minutes.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <small style="color: #999;">If you didn't request this, please ignore this email.</small>
        </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("Email send failed:", error);
        return { success: false, error: error.message };
    }
};