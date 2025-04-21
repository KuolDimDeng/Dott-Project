// server/socketServer.js

const { Server } = require('socket.io');

function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_FRONTEND_URL || "https://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('start_onboarding', async (userId) => {
      try {
        // Simulating onboarding steps
        await simulateStep('Creating business record', 10, socket);
        await simulateStep('Updating user profile', 30, socket);
        await simulateStep('Creating user database', 50, socket);
        await simulateStep('Setting up user database', 70, socket);
        await simulateStep('Finalizing onboarding', 90, socket);

        socket.emit('onboarding_complete');
      } catch (error) {
        console.error('Onboarding error:', error);
        socket.emit('onboarding_error', { message: 'Onboarding failed' });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });

  return io;
}

async function simulateStep(step, progress, socket) {
  socket.emit('onboarding_progress', { step, progress });
  await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate 2 second delay
}

module.exports = initSocketServer;