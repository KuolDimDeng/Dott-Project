import React, { useState, useEffect, useMemo } from 'react';
import Typography from '@mui/material/Typography';

function DateTime() {
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setDateTime(new Date());
    }, 60000); // Update every minute

    return () => {
      clearInterval(timer);
    };
  }, []);

  const formattedDateTime = useMemo(() => {
    const options = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    };
    return dateTime.toLocaleString('en-US', options);
  }, [dateTime]);

  return (
    <Typography variant="body2" color="inherit">
      {formattedDateTime}
    </Typography>
  );
}

export default DateTime;