import React, { useState, useEffect } from 'react';
import Typography from '@mui/material/Typography';

function DateTime() {
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setDateTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const formatDateTime = (date) => {
    const options = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    };
    return date.toLocaleString('en-US', options);
  };

  return (
    <Typography variant="body2" color="inherit">
      {formatDateTime(dateTime)}
    </Typography>
  );
}

export default DateTime;