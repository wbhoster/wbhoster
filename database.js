const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'iptv_admin.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Admins table
      db.run(`
        CREATE TABLE IF NOT EXISTS admins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Clients table
      db.run(`
        CREATE TABLE IF NOT EXISTS clients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT NOT NULL,
          whatsapp_number TEXT NOT NULL,
          address TEXT,
          notes TEXT,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Subscriptions table
      db.run(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_id INTEGER NOT NULL,
          plan_name TEXT NOT NULL,
          device_type TEXT,
          username TEXT,
          password TEXT,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          status TEXT DEFAULT 'active',
          price REAL,
          payment_status TEXT DEFAULT 'paid',
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
        )
      `);

      // WhatsApp alerts log table
      db.run(`
        CREATE TABLE IF NOT EXISTS whatsapp_alerts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_id INTEGER NOT NULL,
          subscription_id INTEGER,
          whatsapp_number TEXT NOT NULL,
          message TEXT NOT NULL,
          status TEXT,
          sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
          FOREIGN KEY (subscription_id) REFERENCES subscriptions (id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          // Create default admin if not exists
          const defaultUsername = process.env.ADMIN_USERNAME || 'admin';
          const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
          
          db.get('SELECT * FROM admins WHERE username = ?', [defaultUsername], (err, row) => {
            if (!row) {
              const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
              db.run('INSERT INTO admins (username, password) VALUES (?, ?)', 
                [defaultUsername, hashedPassword], 
                (err) => {
                  if (err) console.error('Error creating default admin:', err);
                  else console.log('✅ Default admin created:', defaultUsername);
                }
              );
            }
          });
          
          resolve();
        }
      });
    });
  });
};

// Helper function to run database queries
const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const getQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const allQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

module.exports = {
  db,
  initDatabase,
  runQuery,
  getQuery,
  allQuery
};
