#!/bin/bash

echo "================================================"
echo "  IPTV Admin Portal - Database Setup Script"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo -e "${RED}❌ MySQL is not installed${NC}"
    echo ""
    echo "Install MySQL first:"
    echo "  Ubuntu/Debian: sudo apt install mysql-server"
    echo "  macOS: brew install mysql"
    exit 1
fi

echo -e "${GREEN}✓ MySQL is installed${NC}"
echo ""

# Prompt for MySQL credentials
echo "Enter MySQL root password (press Enter if no password):"
read -s MYSQL_PASSWORD

if [ -z "$MYSQL_PASSWORD" ]; then
    MYSQL_CMD="mysql -u root"
else
    MYSQL_CMD="mysql -u root -p$MYSQL_PASSWORD"
fi

echo ""
echo "Testing MySQL connection..."

# Test connection
if ! $MYSQL_CMD -e "SELECT 1;" &> /dev/null; then
    echo -e "${RED}❌ Failed to connect to MySQL${NC}"
    echo "Please check your MySQL root password"
    exit 1
fi

echo -e "${GREEN}✓ Connected to MySQL${NC}"
echo ""

# Create database
echo "Creating database 'iptv_admin'..."
$MYSQL_CMD -e "CREATE DATABASE IF NOT EXISTS iptv_admin;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database created${NC}"
else
    echo -e "${RED}❌ Failed to create database${NC}"
    exit 1
fi

# Import schema
echo "Importing schema..."
if [ -f "schema.sql" ]; then
    if [ -z "$MYSQL_PASSWORD" ]; then
        mysql -u root iptv_admin < schema.sql
    else
        mysql -u root -p"$MYSQL_PASSWORD" iptv_admin < schema.sql
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Schema imported successfully${NC}"
    else
        echo -e "${RED}❌ Failed to import schema${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ schema.sql file not found${NC}"
    exit 1
fi

# Update .env file
echo ""
echo "Updating .env file..."

if [ -f ".env" ]; then
    # Update DB_PASSWORD in .env
    if [ -z "$MYSQL_PASSWORD" ]; then
        sed -i.bak 's/^DB_PASSWORD=.*/DB_PASSWORD=/' .env
    else
        sed -i.bak "s/^DB_PASSWORD=.*/DB_PASSWORD=$MYSQL_PASSWORD/" .env
    fi
    
    # Update DB_USER
    sed -i.bak 's/^DB_USER=.*/DB_USER=root/' .env
    
    echo -e "${GREEN}✓ .env file updated${NC}"
else
    echo -e "${YELLOW}⚠ .env file not found (already configured)${NC}"
fi

# Test connection with Node.js
echo ""
echo "Testing database connection with Node.js..."
node -e "require('./database').testConnection().then(() => process.exit(0)).catch(() => process.exit(1))" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Node.js can connect to database${NC}"
else
    echo -e "${YELLOW}⚠ Could not test Node.js connection (this is OK if dependencies aren't installed yet)${NC}"
fi

echo ""
echo "================================================"
echo -e "${GREEN}✅ Database setup complete!${NC}"
echo "================================================"
echo ""
echo "Next steps:"
echo "  1. Install Node.js dependencies: npm install"
echo "  2. Start the server: npm start"
echo "  3. Open http://localhost:3000"
echo "  4. Login with: admin / admin123"
echo ""
echo "================================================"
