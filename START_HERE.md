# 🚀 START HERE - IPTV Admin Portal

Welcome to your IPTV Admin Portal! This guide will get you up and running in 2 minutes.

## ⚡ Quick Start

### Start the Server
```bash
npm start
```

### Access the Portal
Open your browser and go to:
```
http://localhost:3000
```

### Login
```
Username: admin
Password: admin123
```

**That's it! You're ready to go! 🎉**

---

## 📚 What's Next?

### Immediate Actions:
1. ✅ **Add your first client** - Click "Clients" → "Add Client"
2. ✅ **Create a subscription** - Click "Subscriptions" → "Add Subscription"
3. ✅ **View dashboard** - See your statistics

### Before Production:
1. 🔒 **Change admin password** (current: admin/admin123)
2. 🔐 **Update JWT_SECRET** in `.env` file
3. 📱 **Configure WhatsApp API** for real alerts (see README.md)

---

## 📖 Full Documentation

- **INSTALLATION.md** - Detailed setup and troubleshooting
- **README.md** - Complete feature guide and API docs

---

## ✨ Features You Have Now

### Client Management
- Add, edit, and delete clients
- Track contact information
- WhatsApp integration ready

### Subscription Management
- Create and manage subscriptions
- Track expiry dates
- One-click renewal
- Payment status tracking

### Dashboard
- Real-time statistics
- Active/expired subscriptions
- Expiry warnings
- Recent activity

### WhatsApp Alerts
- Manual reminders (works now!)
- Bulk messaging (works now!)
- Automated alerts (needs WhatsApp API setup)
- Alert history

---

## 🎯 Common Tasks

### Add a New Client
1. Click **"Clients"** in sidebar
2. Click **"Add Client"** button
3. Fill in: Name, Phone, WhatsApp Number
4. Click **"Add Client"**

### Create Subscription
1. Click **"Subscriptions"** in sidebar
2. Click **"Add Subscription"** button
3. Select client and plan details
4. Set start and end dates
5. Click **"Add Subscription"**

### Renew Subscription
1. Find subscription (Dashboard, Subscriptions, or Expiring Soon)
2. Click **"Renew"** button
3. Enter months to extend
4. Click **"Renew Subscription"**

### Send WhatsApp Alert
1. Find subscription in any list
2. Click bell icon (🔔)
3. Confirm to send reminder

---

## 🔧 Configuration (Optional)

### WhatsApp API Setup

**Without setup:** Messages are logged to console (mock mode)
**With setup:** Real WhatsApp messages are sent

See **README.md** → "WhatsApp API Setup" section for details.

### Change Port

Edit `.env` file:
```
PORT=3001
```

---

## ❓ Need Help?

### Server won't start?
```bash
# Check if port 3000 is available
# Change PORT in .env if needed
```

### Forgot password?
```bash
# Delete iptv_admin.db file to reset
# Default admin/admin123 will be recreated
```

### WhatsApp not working?
- It's in mock mode by default
- Check console logs to see "sent" messages
- Configure real API in .env for production

---

## 🎊 You're All Set!

Your IPTV Admin Portal is ready to manage clients and subscriptions.

**Pro Tip:** Start by adding a few test clients and subscriptions to familiarize yourself with the system.

---

**Enjoy managing your IPTV business! 📺🚀**
