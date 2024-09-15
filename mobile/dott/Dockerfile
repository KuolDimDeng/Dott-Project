FROM node:20

WORKDIR /app

# Install Expo CLI globally
RUN npm install -g expo-cli

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your app's source code
COPY . .

# Expose the ports Expo uses
EXPOSE 19000 19001 19002 8081

# Start the Expo development server
CMD ["npx", "expo", "start", "--tunnel"]