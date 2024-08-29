'use client'
import React from 'react';
import { List, ListItem, ListItemText, Typography, Box } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledListItem = styled(ListItem)(({ theme, isRead }) => ({
  backgroundColor: isRead ? 'transparent' : theme.palette.action.hover,
  '&:hover': {
    backgroundColor: theme.palette.action.selected,
  },
}));

const AlertsPage = ({ alerts, onMarkAsRead }) => {
  return (
    <Box sx={{ maxWidth: 600, margin: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Alerts
      </Typography>
      <List>
        {alerts.map((alert) => (
          <StyledListItem
            key={alert.id}
            isRead={alert.is_read}
            onClick={() => onMarkAsRead(alert.id)}
          >
            <ListItemText
              primary={
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: alert.is_read ? 'normal' : 'bold',
                    color: 'primary.main',
                  }}
                >
                  {alert.alert.subject}
                </Typography>
              }
              secondary={
                <>
                  <Typography component="span" variant="body2" color="text.primary">
                    {new Date(alert.alert.created_at).toLocaleString()}
                  </Typography>
                  <Typography variant="body2">{alert.alert.message}</Typography>
                </>
              }
            />
          </StyledListItem>
        ))}
      </List>
    </Box>
  );
};

export default AlertsPage;