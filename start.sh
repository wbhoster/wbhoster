#!/bin/bash

# IPTV Admin Portal Startup Script

echo "🚀 Starting IPTV Admin Portal..."
echo ""

# Set default port if not specified in .env
export PORT=3000

# Start the server
node server.js
