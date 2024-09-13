# Use an official Node.js runtime as a base image
FROM node:20

# Install dependencies, including build tools and required libraries
RUN apt-get update && apt-get install -y \
  build-essential \
  curl \
  git \
  python3 \
  python3-pip \
  automake \
  autoconf \
  libtool \
  pkg-config \
  unzip \
  && rm -rf /var/lib/apt/lists/*

# Install OpenJDK 11 manually
RUN apt-get install -y wget \
    && wget https://download.java.net/openjdk/jdk11/ri/openjdk-11+28_linux-x64_bin.tar.gz \
    && tar -xzf openjdk-11+28_linux-x64_bin.tar.gz -C /usr/local/ \
    && rm openjdk-11+28_linux-x64_bin.tar.gz \
    && mv /usr/local/jdk-11 /usr/local/openjdk-11 \
    && update-alternatives --install /usr/bin/java java /usr/local/openjdk-11/bin/java 1

# Set JAVA_HOME environment variable
ENV JAVA_HOME=/usr/local/openjdk-11
ENV PATH=$JAVA_HOME/bin:$PATH

# Install Android SDK manually
RUN mkdir -p /usr/local/android-sdk/cmdline-tools \
    && wget https://dl.google.com/android/repository/commandlinetools-linux-6858069_latest.zip \
    && unzip commandlinetools-linux-6858069_latest.zip -d /usr/local/android-sdk/cmdline-tools \
    && rm commandlinetools-linux-6858069_latest.zip \
    && mkdir /usr/local/android-sdk/cmdline-tools/latest \
    && mv /usr/local/android-sdk/cmdline-tools/cmdline-tools/* /usr/local/android-sdk/cmdline-tools/latest/ \
    && yes | /usr/local/android-sdk/cmdline-tools/latest/bin/sdkmanager --licenses \
    && /usr/local/android-sdk/cmdline-tools/latest/bin/sdkmanager "platform-tools" "platforms;android-29"

# Set ANDROID_HOME environment variable
ENV ANDROID_HOME=/usr/local/android-sdk
ENV PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your app’s source code
COPY . .

# Expose the Metro Bundler port (8081)
EXPOSE 8081

# Start the React Native development server
CMD ["npm", "run", "start"]
