// components/DeviceConfiguration.js
import React, { useState } from 'react';

const DeviceConfiguration = () => {
  const [device, setDevice] = useState(null);

  const connectToDevice = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['battery_service'] }],
      });
      setDevice(device);
      console.log('Connected to device:', device);
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  return (
    <div>
      <h2>Bluetooth Device Configuration</h2>
      <button onClick={connectToDevice}>Connect to Bluetooth Device</button>
      {device && <p>Connected to: {device.name}</p>}
    </div>
  );
};

export default DeviceConfiguration;
