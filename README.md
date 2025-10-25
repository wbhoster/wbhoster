# 🎬 IPTV Admin Portal

> A complete Node.js + MySQL IPTV Client Management Portal with WhatsApp integration using 360Messenger API

[![Node.js](https://img.shields.io/badge/Node.js-v14+-green.svg)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-blue.svg)](https://www.mysql.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🌟 Key Features

### 📊 Client & Subscription Management
- ✅ Complete CRUD operations for clients and subscriptions
- ✅ Auto-generated numeric usernames (11 digits)
- ✅ Auto-generated numeric passwords (10+ digits, securely hashed)
- ✅ Multiple package durations: **1, 3, 6, or 12 months**
- ✅ Subscription renewal with new credentials
- ✅ Multiple host URL management
- ✅ Search, filters, and pagination

### 📱 WhatsApp Integration (360Messenger API)
- ✅ **4 Editable Message Templates** with emoji support:
  - Welcome Message (sent on subscription creation)
  - Pre-Expiry Alert (7 days before expiry)
  - Expiry Day Alert (sent on expiry day)
  - Renewal Confirmation (sent on renewal)
- ✅ **Custom Message Sender** - Send personalized messages to any number
- ✅ Bulk message support
- ✅ Message history and tracking
- ✅ Scheduled messages (optional delay)

### 🤖 Automated Alert System
- ✅ Automatic WhatsApp alerts based on subscription lifecycle
- ✅ Scheduler using `node-cron` (backup)
- ✅ Protected cron endpoint for cPanel triggers (every 10 minutes)
- ✅ Configurable alert timing (default: 7 days before expiry)
- ✅ Automatic subscription status updates

### 📄 Invoice Generation
- ✅ Professional PDF invoices using PDFKit
- ✅ Auto-generated on subscription creation and renewal
- ✅ Includes client details, subscription info, and branding
- ✅ Downloadable invoices
- ✅ Payment status tracking

### 🔐 Security
- ✅ JWT-based authentication
- ✅ Bcrypt password hashing (10 rounds)
- ✅ Protected API routes
- ✅ Cron secret for automated tasks
- ✅ SQL injection prevention (parameterized queries)

### 🎨 Modern Tech Stack
- ✅ Node.js + Express.js backend
- ✅ MySQL database with optimized schema
- ✅ RESTful API design
- ✅ Ready for React frontend integration
- ✅ cPanel compatible with CloudLinux Node.js

---

## 📦 What's Included

### Backend (Production-Ready)
```
✅ Complete MySQL database schema with indexes
✅ 35+ API endpoints (REST)
✅ Authentication system (JWT)
✅ Client management
✅ Subscription management
✅ Host URL management
✅ WhatsApp template editor
✅ WhatsApp messaging system (360Messenger)
✅ Automated alert scheduler
✅ PDF invoice generation
✅ Dashboard statistics
✅ Error handling & logging
```

### Documentation
```
✅ Complete API documentation
✅ Step-by-step cPanel deployment guide
✅ Environment configuration guide
✅ MySQL schema with sample data
✅ Troubleshooting guide
✅ Security best practices
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js v14+ (v18+ recommended)
- MySQL 5.7+ or 8.0+
- npm or yarn
- 360Messenger API key ([Sign up here](https://360messenger.com))

### Local Installation

1. **Clone/Download the project**
   ```bash
   cd iptv-portal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create MySQL database**
   ```bash
   mysql -u root -p
   CREATE DATABASE iptv_admin;
   exit;
   ```

4. **Import database schema**
   ```bash
   mysql -u root -p iptv_admin < schema.sql
   ```

5. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and API keys
   ```

6. **Start the server**
   ```bash
   # Production
   npm start
   
   # Development (with auto-reload)
   npm run dev
   ```

7. **Access the portal**
   ```
   http://localhost:3000
   
   Default Login:
   Username: admin
   Password: admin123
   ```

---

## 🌐 cPanel Deployment

For complete deployment instructions on cPanel with CloudLinux Node.js hosting, see:

**📖 [DEPLOYMENT.md](DEPLOYMENT.md)** - Comprehensive cPanel deployment guide

Quick overview:
1. Create MySQL database in cPanel
2. Import `schema.sql` via phpMyAdmin
3. Upload files via File Manager or FTP
4. Configure Node.js app in cPanel
5. Set environment variables
6. Install dependencies (`npm install`)
7. Set up cron job for automated alerts
8. Start application

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [PROJECT_COMPLETE.md](PROJECT_COMPLETE.md) | Complete project overview, features, and API reference |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Step-by-step cPanel deployment guide |
| [.env.example](.env.example) | Environment variables template and configuration |
| [schema.sql](schema.sql) | Complete MySQL database schema with sample data |

---

## 🔌 API Endpoints Overview

### Authentication
- `POST /api/auth/login` - Admin login
- `GET /api/auth/verify` - Verify JWT token

### Clients
- `GET /api/clients` - Get all clients (search, pagination)
- `POST /api/clients` - Create client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Subscriptions
- `GET /api/subscriptions` - Get all subscriptions (filters)
- `POST /api/subscriptions` - Create subscription (auto-generates credentials & sends welcome message)
- `POST /api/subscriptions/:id/renew` - Renew subscription (new credentials & sends renewal message)
- `GET /api/subscriptions/:id/invoice` - Download invoice PDF

### Host URLs
- `GET /api/host-urls` - Get all host URLs
- `POST /api/host-urls` - Create host URL
- `PUT /api/host-urls/:id` - Update host URL
- `DELETE /api/host-urls/:id` - Delete host URL

### WhatsApp Templates
- `GET /api/templates` - Get all templates
- `PUT /api/templates/:id` - Update template (with emoji support)
- `POST /api/templates/:id/preview` - Preview with sample data
- `POST /api/templates/:id/test` - Test send

### WhatsApp Messaging
- `POST /api/whatsapp/send-custom` - Send custom message
- `POST /api/whatsapp/send-bulk` - Send bulk messages
- `GET /api/whatsapp/alerts` - Get message history
- `POST /api/whatsapp/check-alerts` - Manually trigger alert check
- `POST /api/whatsapp/cron/check-expiry` - Automated cron endpoint

**Full API documentation:** [PROJECT_COMPLETE.md](PROJECT_COMPLETE.md)

---

## 📱 360Messenger API Integration

This portal uses the **360Messenger API** for WhatsApp messaging.

### API Endpoint
```
POST https://api.360messenger.com/v2/sendMessage
```

### Authentication
```
Authorization: Bearer YOUR_API_KEY
```

### Message Format
```javascript
{
  phonenumber: "447488888888",  // WhatsApp number
  text: "Hello! 👋",            // Message with emoji support
  url: "https://...",           // Optional: Image URL
  delay: "01-12-2025 09:29"     // Optional: Schedule (MM-DD-YYYY HH:MM GMT)
}
```

### Features Implemented
- ✅ Send text messages with emoji support
- ✅ Optional image attachments
- ✅ Scheduled messages
- ✅ Bulk messaging with rate limiting
- ✅ Error handling and retry logic
- ✅ Message status tracking

---

## 🗄️ Database Schema

9 tables with proper relationships and indexes:

1. **admins** - Admin accounts
2. **clients** - IPTV client information
3. **subscriptions** - Subscription details with auto-generated credentials
4. **host_urls** - Server URLs for IPTV streams
5. **whatsapp_templates** - 4 editable message templates
6. **whatsapp_alerts** - Message history log
7. **invoices** - Generated invoice records
8. **system_settings** - Application settings
9. **activity_logs** - Audit trail (optional)

**Schema file:** [schema.sql](schema.sql)

---

## ⚙️ Configuration

### Key Environment Variables

```bash
# Database
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=iptv_admin

# 360Messenger API
WHATSAPP_API_KEY=your_api_key

# JWT Secret (Change this!)
JWT_SECRET=your-super-secret-key-min-32-characters

# Cron Secret (Change this!)
CRON_SECRET=your-secure-cron-secret

# Company Info (for invoices)
COMPANY_NAME=Your Company Name
COMPANY_EMAIL=info@example.com
COMPANY_PHONE=+1234567890

# Alert Settings
ALERT_DAYS_BEFORE_EXPIRY=7

# Credentials
PASSWORD_LENGTH=10  # Auto-generated password length
```

**Full configuration:** [.env.example](.env.example)

---

## 🤖 Automated Workflows

### On Subscription Creation
1. Auto-generate username (11-digit numeric)
2. Auto-generate password (10-digit numeric)
3. Hash password with bcrypt
4. Calculate start/end dates based on package duration
5. Create subscription in database
6. Generate PDF invoice
7. Send welcome WhatsApp message with credentials
8. Log all actions

### On Subscription Renewal
1. Generate new username and password
2. Calculate new dates
3. Update subscription
4. Generate renewal invoice
5. Send renewal WhatsApp message
6. Log all actions

### Automated Alert System (Cron)
**Runs every 10 minutes via cPanel cron job**
1. Check for subscriptions expiring in 7 days → Send pre-expiry alert
2. Check for subscriptions expiring today → Send expiry day alert
3. Update expired subscription statuses
4. Log all sent messages

---

## 📊 Features Breakdown

| Feature | Status | Description |
|---------|--------|-------------|
| MySQL Database | ✅ | Complete schema with 9 tables |
| Authentication | ✅ | JWT-based with bcrypt hashing |
| Client Management | ✅ | Full CRUD with search & pagination |
| Subscription Management | ✅ | Auto-credentials, renewal, status tracking |
| Host URL Management | ✅ | Multiple hosts with usage stats |
| Auto-Generate Credentials | ✅ | Numeric username (11) & password (10+) |
| Password Hashing | ✅ | Bcrypt 10 rounds |
| Package Durations | ✅ | 1, 3, 6, or 12 months |
| WhatsApp Templates | ✅ | 4 editable templates with emojis |
| Welcome Message | ✅ | Auto-sent on subscription creation |
| Pre-Expiry Alert | ✅ | Auto-sent 7 days before expiry |
| Expiry Day Alert | ✅ | Auto-sent on expiry day |
| Renewal Message | ✅ | Auto-sent on renewal |
| Custom Messaging | ✅ | Send message to any number |
| Bulk Messaging | ✅ | Send to multiple recipients |
| Message History | ✅ | Complete log with filters |
| Automated Scheduler | ✅ | node-cron + cPanel cron support |
| Invoice Generation | ✅ | Professional PDF with PDFKit |
| Dashboard Statistics | ✅ | Real-time stats |
| RESTful API | ✅ | 35+ endpoints |
| Error Handling | ✅ | Comprehensive error management |
| Deployment Guide | ✅ | Complete cPanel instructions |

---

## 🎨 Frontend Options

The backend API is complete. For the frontend, you have options:

### Option 1: Build React Frontend (Recommended)
```bash
npx create-react-app client
cd client
npm install axios react-router-dom
# Build modern UI with Dark/Light mode toggle
```

### Option 2: Use Existing HTML/JS
The existing `index.html` and `admin-app.js` provide a basic interface.

### Option 3: Use Admin Templates
- [React Admin](https://marmelab.com/react-admin/)
- [Ant Design Pro](https://pro.ant.design/)
- [Material Dashboard](https://www.creative-tim.com/product/material-dashboard-react)

---

## 🧪 Testing

### Test Database Connection
```bash
node -e "require('./database').testConnection()"
```

### Test API Endpoints
```bash
# Health check
curl http://localhost:3000/api/health

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Test WhatsApp API
```bash
# Via admin panel: WhatsApp → Test Connection
# Or via API with token
```

---

## 🛠️ Troubleshooting

### Database Connection Failed
- ✅ Check MySQL is running
- ✅ Verify credentials in `.env`
- ✅ Ensure database exists
- ✅ Check user has privileges

### WhatsApp Messages Not Sending
- ✅ Verify API key is correct
- ✅ Check phone number format (no spaces, +, -)
- ✅ Test API directly with curl
- ✅ Check message logs in database

### Cron Job Not Working
- ✅ Verify cron secret matches `.env`
- ✅ Test endpoint manually with curl
- ✅ Check cPanel cron job logs
- ✅ Ensure application is running

**Full troubleshooting guide:** [DEPLOYMENT.md#troubleshooting](DEPLOYMENT.md#troubleshooting)

---

## 📊 Project Stats

- **Backend:** 100% Complete ✅
- **Database:** 100% Complete ✅
- **API Endpoints:** 35+
- **Lines of Code:** 3000+
- **Tables:** 9
- **Features:** 50+
- **Documentation:** Comprehensive

---

## 🔒 Security Recommendations

1. **Change default admin password** immediately after first login
2. **Use strong JWT_SECRET** (32+ random characters)
3. **Use strong CRON_SECRET** (32+ random characters)
4. **Keep .env file secure** (chmod 600)
5. **Enable HTTPS** for production (cPanel SSL)
6. **Regular backups** of MySQL database
7. **Update dependencies** regularly (`npm update`)
8. **Monitor logs** for suspicious activity

---

## 📈 Future Enhancements

Possible additions (not required, but nice to have):

- [ ] React admin panel with Material-UI
- [ ] Client self-service portal
- [ ] Payment gateway integration (Stripe/PayPal)
- [ ] Email notifications (SendGrid/Mailgun)
- [ ] SMS integration (Twilio)
- [ ] Advanced analytics and charts
- [ ] Multi-language support (i18n)
- [ ] 2FA for admin login
- [ ] Export to CSV/Excel
- [ ] Automated database backups

---

## 🤝 Support

For issues or questions:

1. Check [DEPLOYMENT.md](DEPLOYMENT.md) for deployment help
2. Check [PROJECT_COMPLETE.md](PROJECT_COMPLETE.md) for feature documentation
3. Review [.env.example](.env.example) for configuration
4. Check `schema.sql` for database structure

---

## 📝 License

This project is licensed under the MIT License.

---

## 🎯 Summary

This IPTV Admin Portal provides a **complete backend solution** for managing IPTV subscriptions with:

✅ **Automated WhatsApp alerts** via 360Messenger API
✅ **Auto-generated numeric credentials** (11-digit username, 10+ digit password)
✅ **4 editable message templates** with emoji support
✅ **Professional PDF invoices** auto-generated on creation/renewal
✅ **Custom message sender** for personalized communications
✅ **Secure authentication** with JWT and bcrypt
✅ **Comprehensive API** with 35+ endpoints
✅ **cPanel deployment ready** with detailed guide
✅ **Production-tested** MySQL schema with optimized indexes

**The backend is complete and production-ready.** Build your frontend of choice on top of this robust API!

---

**Built with ❤️ for efficient IPTV subscription management**

---

## 📞 Quick Links

- [Complete Project Documentation](PROJECT_COMPLETE.md)
- [cPanel Deployment Guide](DEPLOYMENT.md)
- [Environment Configuration](.env.example)
- [Database Schema](schema.sql)
- [360Messenger API](https://360messenger.com)

---

**Ready to deploy?** Follow the step-by-step guide in [DEPLOYMENT.md](DEPLOYMENT.md) 🚀
