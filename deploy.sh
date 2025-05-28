#!/bin/bash

# Configuration
SERVER_HOST="38.180.171.139"
SERVER_PASSWORD="rLC2pprqFo"
SERVER_PATH="/root/tenderlandbotdev"
LOCAL_DIST="./dist"
LOCAL_ENV=".env"

# Check if sshpass is installed
if ! command -v sshpass &> /dev/null; then
    echo "sshpass is not installed. Please install it first:"
    echo "For Ubuntu/Debian: sudo apt-get install sshpass"
    echo "For macOS: brew install hudochenkov/sshpass/sshpass"
    exit 1
fi

# Build the project
echo "Building the project..."
npm run build

# Create a temporary directory for deployment
echo "Preparing files for deployment..."
mkdir -p deploy_temp
cp -r $LOCAL_DIST/* deploy_temp/
cp package.json deploy_temp/
cp package-lock.json deploy_temp/
cp $LOCAL_ENV deploy_temp/

# Create a deployment script
cat > deploy_temp/start.sh << 'EOL'
#!/bin/bash

# Install Node.js and npm if not present
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Install pm2 if not present
if ! command -v pm2 &> /dev/null; then
    echo "pm2 not found. Installing..."
    npm install -g pm2
fi

npm install --production
pm2 start index.js --name tenderland-bot-dev
EOL

chmod +x deploy_temp/start.sh

# Copy files to server using sshpass
echo "Copying files to server..."
sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no -r deploy_temp/* root@$SERVER_HOST:$SERVER_PATH

# Execute remote commands
echo "Setting up the application on the server..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_HOST "mkdir -p $SERVER_PATH && cd $SERVER_PATH && chmod +x start.sh && ./start.sh"

# Cleanup
echo "Cleaning up..."
rm -rf deploy_temp

echo "Deployment completed!" 