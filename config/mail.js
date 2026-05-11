import nodemailer from 'nodemailer';

const sendOrderEmail = async (order, user, type = 'customer') => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const primaryColor = '#5A2A6C'; // Evans Purple
    const accentColor = '#D4AF37';  // Evans Gold
    const bgColor = '#FDFCF8';      // Evans Beige/Off-white
    
    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 15px 0; border-bottom: 1px solid #EEE;">
          <div style="font-weight: 600; color: #333; font-size: 14px;">${item.name}</div>
          <div style="font-size: 12px; color: #888;">Qty: ${item.quantity}</div>
        </td>
        <td style="padding: 15px 0; border-bottom: 1px solid #EEE; text-align: right; font-weight: 600; color: #5A2A6C;">
          ₹${(item.price * item.quantity).toLocaleString('en-IN')}
        </td>
      </tr>
    `).join('');

    const customerEmailContent = `
      <div style="background-color: #F6F6F6; padding: 40px 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 30px; overflow: hidden; shadow: 0 10px 30px rgba(0,0,0,0.05);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, ${primaryColor} 0%, #3D1C49 100%); padding: 50px 40px; text-align: center; color: white;">
            <div style="margin-bottom: 20px;">
              <span style="border: 1px solid rgba(255,255,255,0.3); padding: 8px 20px; border-radius: 50px; font-size: 10px; text-transform: uppercase; letter-spacing: 3px;">Order Confirmed</span>
            </div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 300; letter-spacing: 1px;">Thank you for your purchase!</h1>
            <p style="margin-top: 15px; opacity: 0.8; font-size: 14px;">Hi ${user.username}, we've received your order and are preparing your botanical essentials.</p>
          </div>

          <!-- Body -->
          <div style="padding: 40px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #F0F0F0;">
               <div>
                  <div style="font-size: 10px; text-transform: uppercase; color: #999; letter-spacing: 1px; margin-bottom: 5px;">Order Number</div>
                  <div style="font-weight: 700; color: ${primaryColor};">#${order._id.toString().slice(-6).toUpperCase()}</div>
               </div>
               <div style="text-align: right;">
                  <div style="font-size: 10px; text-transform: uppercase; color: #999; letter-spacing: 1px; margin-bottom: 5px;">Order Date</div>
                  <div style="font-weight: 700; color: #333;">${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
               </div>
            </div>

            <h3 style="font-size: 16px; margin-bottom: 15px; color: #333;">Order Summary</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
              ${itemsHtml}
              <tr>
                <td style="padding: 20px 0; font-weight: 700; font-size: 16px; color: #333;">Total Amount</td>
                <td style="padding: 20px 0; text-align: right; font-weight: 800; font-size: 20px; color: ${primaryColor};">₹${order.totalAmount.toLocaleString('en-IN')}</td>
              </tr>
            </table>

            <div style="background: ${bgColor}; border-radius: 20px; padding: 25px; margin-bottom: 30px; border: 1px solid #F0E6D2;">
              <h4 style="margin: 0 0 10px 0; color: ${primaryColor}; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Shipping To</h4>
              <p style="margin: 0; font-size: 14px; color: #555; line-height: 1.6;">
                <strong>${order.shippingAddress.name}</strong><br>
                ${order.shippingAddress.address}<br>
                ${order.shippingAddress.city}, ${order.shippingAddress.pincode}<br>
                Phone: ${order.shippingAddress.phone}
              </p>
            </div>

            <div style="text-align: center;">
              <a href="https://evanscom.vercel.app/profile" style="display: inline-block; background: ${primaryColor}; color: white; padding: 18px 35px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 14px; box-shadow: 0 10px 20px rgba(90, 42, 108, 0.2);">Track Your Order</a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #FAFAFA; padding: 40px; text-align: center; color: #999;">
            <p style="font-size: 14px; color: ${primaryColor}; font-weight: 700; margin-bottom: 10px;">Evans Luxe Beauty</p>
            <p style="font-size: 12px; line-height: 1.6; margin: 0;">Radiant Skin, Naturally. <br> If you have any questions, reply to this email or contact <br> <strong>support@evansluxe.com</strong></p>
            <div style="margin-top: 25px; font-size: 10px; text-transform: uppercase; letter-spacing: 2px;">&copy; 2026 Evans Luxe. All rights reserved.</div>
          </div>
        </div>
      </div>
    `;

    const adminEmailContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 20px; background: #F0F0F0;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; border-left: 5px solid ${primaryColor}; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 25px;">
             <h2 style="margin: 0; color: ${primaryColor}; font-size: 20px;">🚨 New Order Received</h2>
             <span style="background: #E8F5E9; color: #2E7D32; padding: 4px 12px; border-radius: 50px; font-size: 10px; font-weight: 800; text-transform: uppercase;">Paid/Pending</span>
          </div>
          
          <div style="background: #F9F9F9; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
             <p style="margin: 0 0 5px 0; font-size: 12px; color: #999; text-transform: uppercase;">Customer Details</p>
             <p style="margin: 0; font-weight: 700; color: #333; font-size: 16px;">${user.username}</p>
             <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">📞 ${user.mobile} | ✉️ ${user.email}</p>
          </div>

          <div style="margin-bottom: 25px;">
             <p style="margin: 0 0 10px 0; font-size: 12px; color: #999; text-transform: uppercase;">Order Items</p>
             <table style="width: 100%; border-collapse: collapse;">
                ${order.items.map(i => `
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #EEE; font-size: 14px; color: #333;">${i.name} <strong>x ${i.quantity}</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #EEE; text-align: right; font-weight: 700; color: ${primaryColor}; font-size: 14px;">₹${(i.price * i.quantity).toLocaleString('en-IN')}</td>
                  </tr>
                `).join('')}
                <tr>
                   <td style="padding-top: 15px; font-weight: 800; font-size: 16px;">Total Revenue</td>
                   <td style="padding-top: 15px; text-align: right; font-weight: 800; font-size: 18px; color: #2E7D32;">₹${order.totalAmount.toLocaleString('en-IN')}</td>
                </tr>
             </table>
          </div>

          <div style="text-align: center; margin-top: 30px;">
             <a href="https://admin-evans.vercel.app/orders/${order._id}" style="display: block; background: ${primaryColor}; color: white; padding: 15px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px;">Process Order in Dashboard</a>
          </div>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"Evans Luxe Beauty" <${process.env.EMAIL_USER}>`,
      to: type === 'customer' ? user.email : (process.env.ADMIN_EMAIL || process.env.EMAIL_USER),
      subject: type === 'customer' 
        ? `✨ Order Confirmed: Your Evans Luxe Essentials are on the way! (#${order._id.toString().slice(-6).toUpperCase()})` 
        : `🚨 NEW ORDER: ₹${order.totalAmount.toLocaleString('en-IN')} from ${user.username}`,
      html: type === 'customer' ? customerEmailContent : adminEmailContent,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] ${type} notification sent successfully to ${type === 'customer' ? user.email : 'Admin'}`);
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send ${type} email:`, error.message);
  }
};

export default sendOrderEmail;

