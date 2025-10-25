# IPTV Admin Portal

A comprehensive admin portal for managing IPTV subscriptions with automated WhatsApp alerts for expiring subscriptions.

## 🚀 Features

- **Client Management**: Add, edit, and manage your IPTV clients
- **Subscription Management**: Track subscriptions, renewal dates, and payment status
- **WhatsApp Alerts**: Automated alerts for expiring subscriptions
- **Dashboard**: Real-time statistics and insights
- **Expiry Tracking**: Monitor subscriptions expiring soon
- **Bulk Messaging**: Send WhatsApp messages to multiple clients
- **Authentication**: Secure admin login system
- **Responsive UI**: Modern, beautiful interface that works on all devices

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- WhatsApp Business API credentials (Meta) or Twilio account (optional for testing)

## 🔧 Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   
   Edit the `.env` file and update the following:
   
   - Change `JWT_SECRET` to a strong random string
   - Update admin credentials (default: admin/admin123)
   - Add your WhatsApp API credentials (see WhatsApp Setup section below)

3. **Start the server**:
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Access the portal**:
   
   Open your browser and go to: `http://localhost:3000`
   
   Default login credentials:
   - Username: `admin`
   - Password: `admin123`
   
   **⚠️ IMPORTANT: Change the default password after first login!**

## 📱 WhatsApp API Setup

### Option 1: Meta WhatsApp Business API (Recommended)

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app or use an existing one
3. Add WhatsApp product to your app
4. Get your:
   - Phone Number ID
   - Access Token
5. Add these to your `.env` file:
   ```
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
   WHATSAPP_ACCESS_TOKEN=your_access_token
   ```

### Option 2: Twilio WhatsApp API

1. Sign up at [Twilio](https://www.twilio.com/console)
2. Get your WhatsApp-enabled phone number
3. Get your Account SID and Auth Token
4. Uncomment and configure in `.env`:
   ```
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
   ```
5. Uncomment the Twilio section in `services/whatsappService.js`

### Testing Without WhatsApp API

The application works in mock mode if no WhatsApp API is configured. Messages will be logged to the console but not actually sent. This is useful for testing.

## 📖 User Guide

### Adding a Client

1. Navigate to the **Clients** page
2. Click **Add Client**
3. Fill in the client details:
   - Name (required)
   - Phone number (required)
   - WhatsApp number (required)
   - Email (optional)
   - Address (optional)
   - Notes (optional)
4. Click **Add Client**

### Adding a Subscription

1. Navigate to the **Subscriptions** page
2. Click **Add Subscription**
3. Select the client and fill in:
   - Plan name (e.g., "Premium IPTV")
   - Device type (e.g., "Android Box")
   - Login credentials (username/password)
   - Start and end dates
   - Price and payment status
4. Click **Add Subscription**

### Renewing a Subscription

1. Find the subscription in any list
2. Click the **Renew** button
3. Enter renewal duration in months
4. Update price and payment status
5. Click **Renew Subscription**

The system will automatically extend the subscription from the current end date.

### Sending WhatsApp Alerts

#### Individual Reminder
- Click the bell icon next to any subscription to send a renewal reminder

#### Bulk Reminders
1. Go to **Expiring Soon** page
2. Click **Send All Reminders**
3. Confirm to send reminders to all expiring subscriptions

#### Custom Bulk Message
1. Go to **WhatsApp Alerts** page
2. Click **Send Bulk Alert**
3. Choose recipients (all clients or expiring only)
4. Write your message
5. Click **Send Messages**

### Automated Alerts

The system automatically checks for expiring subscriptions every hour and sends alerts:
- 7 days before expiry (configurable in `.env`)
- On the day of expiry

These are logged in the **WhatsApp Alerts** page.

## 📊 Dashboard Overview

The dashboard shows:
- **Total Clients**: All registered clients
- **Active Subscriptions**: Currently active subscriptions
- **Expiring Soon**: Subscriptions expiring in the next 7 days
- **Expired**: Subscriptions that have expired
- **Recent Subscriptions**: Latest subscription activity

## 🗄️ Database

The application uses SQLite for data storage. The database file (`iptv_admin.db`) is created automatically on first run.

### Tables:
- `admins`: Admin user accounts
- `clients`: Client information
- `subscriptions`: Subscription details
- `whatsapp_alerts`: Alert history

### Backup

To backup your data, simply copy the `iptv_admin.db` file to a safe location.

## 🔒 Security

- All API endpoints (except login) require JWT authentication
- Passwords are hashed using bcrypt
- JWT tokens expire after 24 hours
- Always change default credentials in production
- Keep your `.env` file secure and never commit it to version control

## 🎨 Customization

### Alert Message Templates

Edit the message templates in:
- `services/alertService.js` - For automated expiry alerts
- `routes/whatsapp.js` - For manual reminder messages

### Alert Schedule

Change the alert check frequency in `server.js`:
```javascript
setInterval(() => {
  // ... check logic
}, 60 * 60 * 1000); // Currently: every hour (60 minutes)
```

### Expiry Warning Period

Change the days before expiry to send alerts in `.env`:
```
ALERT_DAYS_BEFORE_EXPIRY=7
```

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/change-password` - Change admin password

### Clients
- `GET /api/clients` - Get all clients
- `GET /api/clients/:id` - Get single client
- `POST /api/clients` - Add new client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client
- `GET /api/clients/search/:query` - Search clients

### Subscriptions
- `GET /api/subscriptions` - Get all subscriptions
- `GET /api/subscriptions/expiring` - Get expiring subscriptions
- `GET /api/subscriptions/expired` - Get expired subscriptions
- `GET /api/subscriptions/client/:clientId` - Get client's subscriptions
- `GET /api/subscriptions/stats/dashboard` - Get dashboard statistics
- `POST /api/subscriptions` - Add new subscription
- `PUT /api/subscriptions/:id` - Update subscription
- `POST /api/subscriptions/:id/renew` - Renew subscription
- `DELETE /api/subscriptions/:id` - Delete subscription

### WhatsApp
- `POST /api/whatsapp/send` - Send custom message
- `POST /api/whatsapp/send-renewal-reminder/:id` - Send renewal reminder
- `GET /api/whatsapp/alerts` - Get alert history
- `GET /api/whatsapp/test` - Test WhatsApp connection

## 🐛 Troubleshooting

### WhatsApp messages not sending
1. Check your API credentials in `.env`
2. Verify your WhatsApp number is verified
3. Check the console logs for error messages
4. Test the connection using the test endpoint

### Database errors
1. Check file permissions on `iptv_admin.db`
2. Delete the database file to recreate (will lose data)
3. Check disk space

### Port already in use
Change the `PORT` in `.env` to another number (e.g., 3001)

## 📝 Development

### Project Structure
```
├── server.js               # Main server file
├── database.js            # Database configuration and helpers
├── .env                   # Environment variables
├── package.json          # Dependencies
├── middleware/
│   └── auth.js           # Authentication middleware
├── routes/
│   ├── auth.js          # Authentication routes
│   ├── clients.js       # Client management routes
│   ├── subscriptions.js # Subscription routes
│   └── whatsapp.js      # WhatsApp alert routes
├── services/
│   ├── alertService.js  # Automated alert service
│   └── whatsappService.js # WhatsApp API integration
├── index.html            # Admin portal UI
├── admin-style.css       # Styles
└── admin-app.js          # Frontend JavaScript
```

### Adding New Features

1. Backend: Add routes in `routes/` directory
2. Database: Update schema in `database.js`
3. Frontend: Update `index.html` and `admin-app.js`
4. Services: Add business logic in `services/` directory

## 📄 License

This project is open source and available for personal and commercial use.

## 🤝 Support

For issues, questions, or feature requests, please contact your system administrator.

## 🎯 Future Enhancements

- Multi-admin support with role-based access
- Payment integration
- Client portal for self-service
- Advanced analytics and reports
- Email notifications
- Invoice generation
- Multi-language support
- Dark mode

---

**Made with ❤️ for IPTV business management**
