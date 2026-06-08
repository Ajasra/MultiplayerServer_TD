# Production-ready Node.js server
FROM node:20-alpine

# Set the working directory
WORKDIR /usr/src/app

# Set NODE_ENV to production
ENV NODE_ENV=production

# System packages needed for sqlite3 build/runtime and timezone data
RUN apk add --no-cache python3 make g++ sqlite-libs tzdata
ENV TZ=UTC

# Copy package files
COPY package*.json ./

# Install only production dependencies
# The build artifacts will come from the host via volume mount
RUN npm install --legacy-peer-deps --only=production

# Copy only the server source code
# The built React app and other files come from volume mount
COPY ./src ./src
COPY ./server.js ./

# Expose the port
EXPOSE 3031

# Run the server
CMD [ "node", "server.js" ] 