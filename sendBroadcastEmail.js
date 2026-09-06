import mongoose from 'mongoose';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import User from './models/User.js';

dotenv.config();

const sendBroadcast = async (subject, htmlMessage) => {
  if (!subject || !htmlMessage) {
    console.error('Error: Subject and Message are required.');
    console.log('Usage: node sendBroadcastEmail.js "<Subject>" "<HTML/Text Message>"');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected.');

    const users = await User.find({ email: { $exists: true, $ne: '' } });
    console.log(`Found ${users.length} registered client(s) with email addresses.`);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const primaryColor = '#5A2A6C'; // Evans Purple

    let sentCount = 0;
    for (const user of users) {
      const emailContent = `
        <div style="background-color: #F9F7F5; padding: 30px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; padding: 40px; border-top: 5px solid ${primaryColor}; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
            <h2 style="color: ${primaryColor}; margin-top: 0;">Evans Luxe Beauty</h2>
            <p style="font-size: 15px; color: #333; line-height: 1.6;">Hi ${user.username || 'Valued Customer'},</p>
            <div style="font-size: 15px; color: #444; line-height: 1.6; margin: 20px 0;">
              ${htmlMessage}
            </div>
            <hr style="border: none; border-top: 1px solid #EEE; margin: 30px 0;">
            <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
              Evans Luxe Beauty | Radiant Skin, Naturally<br>
              Sent from evansluxebeauty@gmail.com
            </p>
          </div>
        </div>
      `;

      try {
        await transporter.sendMail({
          from: `"Evans Luxe Beauty" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: subject,
          html: emailContent,
        });
        console.log(`✅ Sent email to ${user.username} (${user.email})`);
        sentCount++;
      } catch (err) {
        console.error(`❌ Failed to send to ${user.email}: ${err.message}`);
      }
    }

    console.log(`\n🎉 Finished sending email broadcast to ${sentCount}/${users.length} clients.`);
    process.exit(0);
  } catch (error) {
    console.error('Broadcast failed:', error.message);
    process.exit(1);
  }
};

const subjectArg = process.argv[2];
const messageArg = process.argv[3];

if (subjectArg && messageArg) {
  sendBroadcast(subjectArg, messageArg);
} else {
  console.log('Broadcast script ready.');
}

export default sendBroadcast;
