# Quick Installation Guide

## ⚡ Quick Start (3 steps)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure (Optional for testing)
The system will work out of the box with default settings. For production:
- Edit `.env` file
- Change admin password (default: admin/admin123)
- Add WhatsApp API credentials

### 3. Start the Server
```bash
npm start
```

Then open your browser to: **http://localhost:3000**

Default login:
- **Username**: admin
- **Password**: admin123

## ✅ What You Get

### Out of the Box (No Configuration Needed):
✓ Admin portal running on port 3000
✓ SQLite database (auto-created)
✓ Default admin account
✓ Full client management
✓ Subscription tracking
✓ Dashboard with statistics
✓ Mock WhatsApp alerts (logged to console)

### With WhatsApp API Configuration:
✓ Real WhatsApp message sending
✓ Automated expiry alerts
✓ Bulk messaging
✓ SMS-like notifications

## 🔐 Security Checklist

Before going to production:

- [ ] Change default admin password
- [ ] Update `JWT_SECRET` in `.env` to a strong random string
- [ ] Configure proper WhatsApp API credentials
- [ ] Set up HTTPS/SSL for production
- [ ] Backup database regularly
- [ ] Never commit `.env` file to git

## 📱 WhatsApp Setup (Optional)

### For Testing
Skip this - the system works in mock mode. Messages are logged but not sent.

### For Production

**Option A: Meta WhatsApp Business API** (Recommended)
1. Visit: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
2. Create a WhatsApp Business app
3. Get Phone Number ID and Access Token
4. Add to `.env`:
   ```
   WHATSAPP_PHONE_NUMBER_ID=your_id_here
   WHATSAPP_ACCESS_TOKEN=your_token_here
   ```

**Option B: Twilio WhatsApp API**
1. Visit: https://www.twilio.com/console
2. Get Account SID, Auth Token, and WhatsApp number
3. Uncomment Twilio section in `.env`
4. Uncomment Twilio code in `services/whatsappService.js`

## 🚀 First Steps After Installation

1. **Login**: Use admin/admin123
2. **Change Password**: Go to Settings (TODO: add this feature)
3. **Add a Client**: Click "Clients" → "Add Client"
4. **Add Subscription**: Click "Subscriptions" → "Add Subscription"
5. **Test WhatsApp**: Go to "WhatsApp Alerts" → "Send Bulk Alert"

## 🐛 Common Issues

### Port 3000 already in use
```bash
# Change PORT in .env to 3001 or any other available port
PORT=3001
```

### Cannot find module error
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Database locked error
```bash
# Stop the server and restart
# Check if another instance is running
ps aux | grep node
kill <process_id>  # if found
```

### WhatsApp not sending
- Check `.env` credentials
- Messages are logged to console in mock mode
- Check server logs for errors

## 📞 Need Help?

Check the full README.md for:
- Detailed feature guide
- API documentation
- Customization options
- Troubleshooting

## 🎉 You're Ready!

The IPTV Admin Portal is now installed and ready to manage your clients and subscriptions!
