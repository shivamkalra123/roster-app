const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

async function sendMail() {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL,
      to: "kalrashivam47@gmail.com",
      subject: "Test Mail",
      text: "Hello from Nodemailer 🚀",
    });

    console.log("Email sent:", info.response);
  } catch (error) {
    console.error("Error:", error);
  }
}

sendMail();