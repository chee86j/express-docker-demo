# Starting from the official Node.js 20 Alpine image source
# Build map:
# docker-compose.yml -> builds this Dockerfile -> runs src/index.js (API + Postgres check)
FROM node:20-alpine AS base

# Set the working directory inside the container so commands run in the right place
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies with production flag to avoid dev dependencies
RUN npm install --production

# Copy the application code to the working directory
COPY src ./src
COPY public ./public

# Expose the port the app runs on
EXPOSE 3000

# Define the commands to run the application
CMD ["node", "src/index.js"]
