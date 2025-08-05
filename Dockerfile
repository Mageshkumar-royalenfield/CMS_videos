# Use the official Node.js 18 image as a base
FROM node:18-slim
 
# Create app directory
WORKDIR /usr/src/app
 
# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install --production
 
# Copy app files
COPY . .
 
# Expose the port Cloud Run expects
EXPOSE 8080
 
# Run the app
CMD ["npm", "start"]