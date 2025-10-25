-- ==========================================
-- IPTV Admin Portal - MySQL Database Schema
-- ==========================================
-- Version: 1.0
-- Database: iptv_admin
-- ==========================================

-- Create database (if running manually)
-- CREATE DATABASE IF NOT EXISTS iptv_admin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE iptv_admin;

-- ==========================================
-- 1. Admins Table
-- ==========================================
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    full_name VARCHAR(255),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 2. Host URLs Table
-- ==========================================
CREATE TABLE IF NOT EXISTS host_urls (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 3. Clients Table
-- ==========================================
CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    whatsapp_number VARCHAR(50) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    notes TEXT,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone (phone),
    INDEX idx_whatsapp (whatsapp_number),
    INDEX idx_email (email),
    INDEX idx_status (status),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 4. Subscriptions Table
-- ==========================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    host_url_id INT,
    package_duration INT NOT NULL COMMENT 'Duration in months: 1, 3, 6, or 12',
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL COMMENT 'Securely hashed password',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('active', 'expired', 'suspended', 'cancelled') DEFAULT 'active',
    price DECIMAL(10, 2),
    payment_status ENUM('paid', 'pending', 'failed') DEFAULT 'paid',
    device_type VARCHAR(100),
    notes TEXT,
    invoice_generated BOOLEAN DEFAULT FALSE,
    welcome_sent BOOLEAN DEFAULT FALSE,
    pre_expiry_sent BOOLEAN DEFAULT FALSE,
    expiry_day_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (host_url_id) REFERENCES host_urls(id) ON DELETE SET NULL,
    INDEX idx_client_id (client_id),
    INDEX idx_host_url_id (host_url_id),
    INDEX idx_status (status),
    INDEX idx_end_date (end_date),
    INDEX idx_username (username),
    INDEX idx_package_duration (package_duration)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 5. WhatsApp Message Templates Table
-- ==========================================
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_type ENUM('welcome', 'pre_expiry', 'expiry_day', 'renewal') NOT NULL UNIQUE,
    template_name VARCHAR(255) NOT NULL,
    message_content TEXT NOT NULL,
    description TEXT,
    variables TEXT COMMENT 'JSON array of available variables',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_template_type (template_type),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 6. WhatsApp Alerts Log Table
-- ==========================================
CREATE TABLE IF NOT EXISTS whatsapp_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    subscription_id INT,
    whatsapp_number VARCHAR(50) NOT NULL,
    message_type ENUM('welcome', 'pre_expiry', 'expiry_day', 'renewal', 'custom') NOT NULL,
    message_content TEXT NOT NULL,
    status ENUM('pending', 'sent', 'failed', 'delivered', 'read') DEFAULT 'pending',
    api_response TEXT,
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
    INDEX idx_client_id (client_id),
    INDEX idx_subscription_id (subscription_id),
    INDEX idx_whatsapp_number (whatsapp_number),
    INDEX idx_message_type (message_type),
    INDEX idx_status (status),
    INDEX idx_sent_at (sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 7. Invoices Table
-- ==========================================
CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_id INT NOT NULL,
    subscription_id INT NOT NULL,
    invoice_date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_status ENUM('paid', 'pending', 'cancelled') DEFAULT 'paid',
    invoice_type ENUM('new', 'renewal') NOT NULL,
    pdf_path VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
    INDEX idx_invoice_number (invoice_number),
    INDEX idx_client_id (client_id),
    INDEX idx_subscription_id (subscription_id),
    INDEX idx_invoice_date (invoice_date),
    INDEX idx_payment_status (payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 8. System Settings Table
-- ==========================================
CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(50) DEFAULT 'text',
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 9. Activity Log Table (Optional - for audit trail)
-- ==========================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT,
    action_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id INT,
    description TEXT,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL,
    INDEX idx_admin_id (admin_id),
    INDEX idx_action_type (action_type),
    INDEX idx_entity_type (entity_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Insert Default Data
-- ==========================================

-- Insert default admin (password: admin123 - hashed with bcrypt)
INSERT INTO admins (username, password, email, full_name) VALUES 
('admin', '$2a$10$YourHashedPasswordHere', 'admin@example.com', 'System Administrator')
ON DUPLICATE KEY UPDATE username=username;

-- Insert default WhatsApp message templates with emoji support
INSERT INTO whatsapp_templates (template_type, template_name, message_content, description, variables) VALUES 
(
    'welcome',
    'Welcome Message',
    '🎉 Welcome {CLIENT_NAME}!\n\nThank you for subscribing to our IPTV service! 📺\n\n✅ Your subscription is now ACTIVE\n\n📋 Subscription Details:\n━━━━━━━━━━━━━━━━━━━\n👤 Username: {USERNAME}\n🔐 Password: {PASSWORD}\n🌐 Host URL: {HOST_URL}\n📅 Valid From: {START_DATE}\n📅 Valid Until: {END_DATE}\n⏳ Duration: {PACKAGE_DURATION} month(s)\n━━━━━━━━━━━━━━━━━━━\n\n📱 Need help? Contact our support team!\n\nEnjoy unlimited entertainment! 🍿🎬',
    'Sent when a new subscription is created',
    '["CLIENT_NAME", "USERNAME", "PASSWORD", "HOST_URL", "START_DATE", "END_DATE", "PACKAGE_DURATION"]'
),
(
    'pre_expiry',
    'Pre-Expiry Reminder (7 days before)',
    '⏰ Renewal Reminder - {CLIENT_NAME}\n\nYour IPTV subscription will expire soon! ⚠️\n\n📋 Subscription Details:\n━━━━━━━━━━━━━━━━━━━\n👤 Username: {USERNAME}\n📅 Expiry Date: {END_DATE}\n⏳ Days Left: {DAYS_LEFT}\n━━━━━━━━━━━━━━━━━━━\n\n💳 Renew now to avoid service interruption!\n\n📞 Contact us today to renew your subscription and keep enjoying uninterrupted entertainment! 📺✨',
    'Sent 7 days before subscription expires',
    '["CLIENT_NAME", "USERNAME", "END_DATE", "DAYS_LEFT"]'
),
(
    'expiry_day',
    'Expiry Day Alert',
    '🚨 URGENT - {CLIENT_NAME}\n\nYour IPTV subscription expires TODAY! ⚠️\n\n📋 Subscription Details:\n━━━━━━━━━━━━━━━━━━━\n👤 Username: {USERNAME}\n📅 Expiry Date: {END_DATE}\n━━━━━━━━━━━━━━━━━━━\n\n⚡ RENEW IMMEDIATELY to avoid service disconnection!\n\n📞 Contact us NOW to renew and continue enjoying your favorite channels! 📺',
    'Sent on the day subscription expires',
    '["CLIENT_NAME", "USERNAME", "END_DATE"]'
),
(
    'renewal',
    'Renewal Confirmation',
    '✅ Subscription Renewed Successfully!\n\nHello {CLIENT_NAME}! 🎉\n\nYour IPTV subscription has been renewed! 📺\n\n📋 Updated Subscription:\n━━━━━━━━━━━━━━━━━━━\n👤 Username: {USERNAME}\n🔐 Password: {PASSWORD}\n🌐 Host URL: {HOST_URL}\n📅 New Start Date: {START_DATE}\n📅 New Expiry Date: {END_DATE}\n⏳ Duration: {PACKAGE_DURATION} month(s)\n━━━━━━━━━━━━━━━━━━━\n\nThank you for continuing with us! 🙏\n\nEnjoy uninterrupted entertainment! 🍿🎬',
    'Sent when subscription is renewed',
    '["CLIENT_NAME", "USERNAME", "PASSWORD", "HOST_URL", "START_DATE", "END_DATE", "PACKAGE_DURATION"]'
)
ON DUPLICATE KEY UPDATE template_name=VALUES(template_name);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES 
('company_name', 'IPTV Solutions', 'text', 'Company name for invoices and branding'),
('company_address', '123 Business Street, City, Country', 'text', 'Company address'),
('company_phone', '+1234567890', 'text', 'Company contact phone'),
('company_email', 'info@iptv-solutions.com', 'text', 'Company contact email'),
('company_website', 'https://www.iptv-solutions.com', 'text', 'Company website'),
('tax_rate', '0', 'number', 'Tax rate percentage'),
('currency', 'USD', 'text', 'Currency code'),
('currency_symbol', '$', 'text', 'Currency symbol'),
('alert_days_before_expiry', '7', 'number', 'Days before expiry to send pre-expiry alert'),
('invoice_prefix', 'INV', 'text', 'Invoice number prefix'),
('auto_generate_credentials', '1', 'boolean', 'Auto-generate username and password'),
('password_length', '10', 'number', 'Length of auto-generated passwords')
ON DUPLICATE KEY UPDATE setting_key=setting_key;

-- Insert some sample host URLs
INSERT INTO host_urls (name, url, description, status) VALUES 
('Main Server', 'http://main-server.example.com:8080', 'Primary streaming server', 'active'),
('Backup Server', 'http://backup-server.example.com:8080', 'Backup streaming server', 'active'),
('EU Server', 'http://eu-server.example.com:8080', 'European streaming server', 'active')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ==========================================
-- Useful Queries for Monitoring
-- ==========================================

-- View all active subscriptions with client details
-- SELECT c.name, c.whatsapp_number, s.username, s.end_date, h.name as host_name
-- FROM subscriptions s
-- JOIN clients c ON s.client_id = c.id
-- LEFT JOIN host_urls h ON s.host_url_id = h.id
-- WHERE s.status = 'active'
-- ORDER BY s.end_date ASC;

-- View subscriptions expiring in next 7 days
-- SELECT c.name, c.whatsapp_number, s.username, s.end_date, 
--        DATEDIFF(s.end_date, CURDATE()) as days_left
-- FROM subscriptions s
-- JOIN clients c ON s.client_id = c.id
-- WHERE s.status = 'active' 
--   AND s.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
-- ORDER BY s.end_date ASC;

-- View WhatsApp alert statistics
-- SELECT message_type, status, COUNT(*) as count
-- FROM whatsapp_alerts
-- GROUP BY message_type, status
-- ORDER BY message_type, status;

-- ==========================================
-- End of Schema
-- ==========================================
