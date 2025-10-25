# IPTV Admin Portal - cPanel Deployment Guide

Complete step-by-step instructions for deploying the IPTV Admin Portal on cPanel with CloudLinux Node.js hosting and MySQL integration.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [File Upload](#file-upload)
4. [Node.js Application Setup](#nodejs-application-setup)
5. [Environment Configuration](#environment-configuration)
6. [Cron Job Configuration](#cron-job-configuration)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## 1. Prerequisites

Before starting, ensure you have:

- ✅ cPanel account with CloudLinux and Node.js support
- ✅ MySQL database access (via cPanel)
- ✅ SSH/FTP access to your hosting account
- ✅ 360Messenger API key ([Get it here](https://360messenger.com))
- ✅ Domain or subdomain pointed to your cPanel hosting

---

## 2. Database Setup

### Step 2.1: Create MySQL Database

1. **Log into cPanel**
2. Navigate to **MySQL® Databases**
3. Create a new database:
   - Database Name: `your_username_iptv_admin` (cPanel adds prefix automatically)
   - Click **Create Database**

### Step 2.2: Create Database User

1. In the same MySQL® Databases section:
   - Username: `your_username_iptvuser`
   - Password: Generate a strong password (save it!)
   - Click **Create User**

### Step 2.3: Add User to Database

1. Under **Add User to Database**:
   - Select the user you created
   - Select the database you created
   - Click **Add**
2. Grant **ALL PRIVILEGES** to the user
3. Click **Make Changes**

### Step 2.4: Import Database Schema

1. Navigate to **phpMyAdmin** in cPanel
2. Select your database from the left sidebar
3. Click the **Import** tab
4. Choose the `schema.sql` file from your project
5. Click **Go** to import

**Note:** The schema.sql file will create all necessary tables and insert default data including:
- Default admin user (username: admin, password: admin123)
- WhatsApp message templates with emoji support
- Sample host URLs
- System settings

---

## 3. File Upload

### Step 3.1: Upload Project Files

Using **File Manager** or **FTP**:

1. Create an application directory (e.g., `/home/username/iptv-portal/`)
2. Upload all project files to this directory:
   ```
   iptv-portal/
   ├── middleware/
   ├── routes/
   ├── services/
   ├── node_modules/ (will be created by npm install)
   ├── invoices/ (will be created automatically)
   ├── database.js
   ├── server.js
   ├── package.json
   ├── .env (create this)
   └── ... (all other files)
   ```

### Step 3.2: Set Permissions

Ensure proper permissions:
```bash
chmod 755 /home/username/iptv-portal/
chmod 644 /home/username/iptv-portal/*.js
chmod 600 /home/username/iptv-portal/.env
```

---

## 4. Node.js Application Setup

### Step 4.1: Access Node.js Setup

1. Log into cPanel
2. Navigate to **Setup Node.js App** (under Software section)
3. Click **Create Application**

### Step 4.2: Configure Application

Fill in the following details:

- **Node.js version**: Select `14.x` or higher (recommended: `18.x`)
- **Application mode**: `Production`
- **Application root**: `/home/username/iptv-portal`
- **Application URL**: `https://yourdomain.com` or subdomain
- **Application startup file**: `server.js`
- **Passenger log file**: Leave default

Click **Create**

### Step 4.3: Install Dependencies

1. After creation, you'll see the virtual environment path
2. Click **Run NPM Install** button in cPanel, OR
3. Via SSH terminal:
   ```bash
   cd /home/username/iptv-portal
   source /home/username/nodevenv/iptv-portal/18/bin/activate
   npm install
   ```

Wait for all dependencies to install (may take a few minutes)

---

## 5. Environment Configuration

### Step 5.1: Create .env File

In your application directory, create a `.env` file with the following content:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# MySQL Database Configuration
DB_HOST=localhost
DB_USER=your_username_iptvuser
DB_PASSWORD=your_database_password_here
DB_NAME=your_username_iptv_admin
DB_PORT=3306

# Default Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# JWT Configuration (Change this to a random 32+ character string!)
JWT_SECRET=change-this-to-a-super-long-random-string-min-32-characters-abc123xyz789
JWT_EXPIRES_IN=7d

# 360Messenger WhatsApp API Configuration
WHATSAPP_API_KEY=your_360messenger_api_key_here
WHATSAPP_API_URL=https://api.360messenger.com/v2/sendMessage

# Alert Configuration
ALERT_DAYS_BEFORE_EXPIRY=7

# Cron Secret (Change this to a secure random string!)
CRON_SECRET=your-secure-random-cron-secret-key-here-change-this

# Company Information (for Invoices)
COMPANY_NAME=Your IPTV Company Name
COMPANY_ADDRESS=123 Business Street, City, Country
COMPANY_PHONE=+1234567890
COMPANY_EMAIL=info@yourdomain.com
COMPANY_WEBSITE=https://yourdomain.com

# Currency Settings
CURRENCY=USD
CURRENCY_SYMBOL=$
TAX_RATE=0

# Invoice Settings
INVOICE_PREFIX=INV

# Auto-generate Credentials
AUTO_GENERATE_CREDENTIALS=true
PASSWORD_LENGTH=10

# CORS Settings
FRONTEND_URL=https://yourdomain.com
```

**Important Security Notes:**
- ✅ Replace all `your_*` placeholders with actual values
- ✅ Generate strong random strings for `JWT_SECRET` and `CRON_SECRET`
- ✅ Keep your `.env` file permissions at `600` (chmod 600 .env)
- ✅ Never commit `.env` to version control

### Step 5.2: Set Environment Variables in cPanel (Alternative)

You can also set environment variables directly in cPanel Node.js App:

1. Go to **Setup Node.js App**
2. Click on your application
3. Scroll to **Environment variables** section
4. Add each variable from the `.env` file above
5. Click **Save**

---

## 6. Cron Job Configuration

### Step 6.1: Set Up Cron Job for WhatsApp Alerts

1. In cPanel, navigate to **Cron Jobs**
2. Add a new cron job with the following settings:

**Common Settings:**
- Minute: `*/10` (every 10 minutes)
- Hour: `*`
- Day: `*`
- Month: `*`
- Weekday: `*`

**Command:**
```bash
curl -X POST https://yourdomain.com/api/whatsapp/cron/check-expiry -H "Authorization: Bearer YOUR_CRON_SECRET_FROM_ENV" >/dev/null 2>&1
```

Replace:
- `https://yourdomain.com` with your actual domain
- `YOUR_CRON_SECRET_FROM_ENV` with the value you set in `.env`

**Alternative (using wget):**
```bash
wget -q -O- --header="Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.com/api/whatsapp/cron/check-expiry >/dev/null 2>&1
```

### Step 6.2: Verify Cron Job

The cron job will:
- ✅ Check for subscriptions expiring in 7 days (send pre-expiry alert)
- ✅ Check for subscriptions expiring today (send expiry day alert)
- ✅ Update expired subscriptions automatically
- ✅ Log all WhatsApp messages sent

---

## 7. Testing

### Step 7.1: Test Database Connection

SSH into your server and run:
```bash
cd /home/username/iptv-portal
source /home/username/nodevenv/iptv-portal/18/bin/activate
node -e "require('./database').testConnection()"
```

Expected output: `✅ MySQL Database connected successfully`

### Step 7.2: Start/Restart Application

1. Go to **Setup Node.js App** in cPanel
2. Click **Stop App** then **Start App** (or **Restart**)
3. Check the application status - should show as **Running**

### Step 7.3: Access the Portal

1. Open your browser
2. Navigate to: `https://yourdomain.com`
3. You should see the IPTV Admin Portal login page

**Default Login:**
- Username: `admin`
- Password: `admin123`

**⚠️ IMPORTANT: Change the default password immediately after first login!**

### Step 7.4: Test WhatsApp Integration

1. Log into the admin portal
2. Go to **Settings** → **WhatsApp** → **Test Connection**
3. Enter a test WhatsApp number
4. Send a test message
5. Verify the message is received

### Step 7.5: Test Invoice Generation

1. Create a test client
2. Create a subscription for that client
3. Check that the invoice is generated and downloadable
4. Invoice should be saved in `/home/username/iptv-portal/invoices/`

---

## 8. Troubleshooting

### Issue: Application won't start

**Solution:**
1. Check application logs in cPanel Node.js App interface
2. Verify all environment variables are set correctly
3. Ensure database credentials are correct
4. Check file permissions (755 for directories, 644 for files)
5. Restart the application

### Issue: Database connection fails

**Solution:**
1. Verify database exists in phpMyAdmin
2. Check database user has correct privileges
3. Ensure DB_HOST is `localhost` (not 127.0.0.1)
4. Test connection using command line:
   ```bash
   mysql -u your_username_iptvuser -p your_username_iptv_admin
   ```

### Issue: WhatsApp messages not sending

**Solution:**
1. Verify 360Messenger API key is correct
2. Test API key using curl:
   ```bash
   curl -X POST https://api.360messenger.com/v2/sendMessage \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -F "phonenumber=1234567890" \
     -F "text=Test message"
   ```
3. Check WhatsApp alert logs in database:
   ```sql
   SELECT * FROM whatsapp_alerts ORDER BY created_at DESC LIMIT 10;
   ```
4. Ensure phone numbers are in correct format (no spaces, + signs)

### Issue: Cron job not working

**Solution:**
1. Test the cron endpoint manually:
   ```bash
   curl -X POST https://yourdomain.com/api/whatsapp/cron/check-expiry \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```
2. Check cPanel cron job email notifications
3. Verify CRON_SECRET matches between .env and cron command
4. Check application logs for errors

### Issue: Invoice generation fails

**Solution:**
1. Check if `invoices/` directory exists and has write permissions:
   ```bash
   chmod 755 /home/username/iptv-portal/invoices
   ```
2. Check PDFKit is installed:
   ```bash
   npm list pdfkit
   ```
3. View application error logs

### Issue: Port conflict or "Address already in use"

**Solution:**
1. cPanel manages the port automatically, don't specify PORT in cPanel
2. The PORT in .env is for local testing only
3. Let cPanel's Passenger handle port assignment

---

## 📝 Important Notes

### Security Best Practices

1. **Change Default Password**: Immediately change the default admin password after first login
2. **Secure .env File**: Keep permissions at 600 and never expose it publicly
3. **Regular Backups**: 
   - Backup MySQL database weekly (cPanel → Backup → Download a MySQL Database)
   - Backup application files monthly
4. **Update Dependencies**: Regularly run `npm update` to keep packages up to date
5. **Monitor Logs**: Check application logs regularly for errors

### Performance Optimization

1. **Enable Node.js Production Mode**: Set `NODE_ENV=production` in .env
2. **Database Indexing**: The schema includes proper indexes for performance
3. **Caching**: Consider enabling MySQL query cache in cPanel
4. **CDN**: Use a CDN for static assets if needed

### Maintenance

1. **Database Cleanup**: Periodically clean old alert logs:
   ```sql
   DELETE FROM whatsapp_alerts WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
   ```
2. **Invoice Cleanup**: Archive old invoices after 1 year
3. **Monitoring**: Set up uptime monitoring for your application

---

## 🆘 Support

If you encounter issues not covered in this guide:

1. Check application logs in cPanel Node.js App interface
2. Review MySQL error logs in cPanel
3. Check browser console for frontend errors
4. Verify all API endpoints are responding: `https://yourdomain.com/api/health`

---

## 📚 Additional Resources

- [cPanel Node.js Documentation](https://docs.cpanel.net/knowledge-base/web-services/how-to-install-a-node.js-application/)
- [360Messenger API Docs](https://360messenger.com/docs)
- [MySQL on cPanel](https://docs.cpanel.net/cpanel/databases/mysql-databases/)

---

## ✅ Post-Deployment Checklist

- [ ] Database created and schema imported
- [ ] Application uploaded and Node.js app configured
- [ ] All dependencies installed via npm
- [ ] Environment variables configured
- [ ] Application started successfully
- [ ] Can access login page at your domain
- [ ] Can log in with default credentials
- [ ] Default admin password changed
- [ ] WhatsApp API tested and working
- [ ] Test client and subscription created
- [ ] Invoice generated successfully
- [ ] Cron job configured and tested
- [ ] SSL certificate active (HTTPS)
- [ ] Backups configured

---

**Congratulations! Your IPTV Admin Portal is now deployed and ready to use! 🎉**
