import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

export const sendEmail = async (to, subject, html) => {
  try {
    console.log("📨 Preparing email for:", to);

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 🔍 Verify connection
    await transporter.verify();
    console.log("✅ SMTP server is ready to send emails");

    const mailOptions = {
      from: `"Doctor Appointment System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.messageId);

    return info;
  } catch (error) {
    console.error("❌ Email error:", error);
    throw error;
  }
};
