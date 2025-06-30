import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Notifications as NotificationIcon,
  Add as AddIcon,
  Event as EventIcon,
  Assignment as FormIcon
} from '@mui/icons-material';
import { format, parseISO, differenceInDays, addMonths } from 'date-fns';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';

const FilingSchedule = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedFormType, setSelectedFormType] = useState('all');
  const [showInitDialog, setShowInitDialog] = useState(false);
  const [view, setView] = useState('table'); // 'table' or 'calendar'

  // Calendar events
  const [calendarEvents, setCalendarEvents] = useState([]);

  useEffect(() => {
    fetchSchedules();
  }, [selectedYear, selectedFormType]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      let url = '/api/taxes/payroll/filing-schedule/';
      const params = new URLSearchParams();
      
      params.append('year', selectedYear);
      if (selectedFormType !== 'all') {
        params.append('form_type', selectedFormType);
      }
      
      url += `?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch schedules');
      
      const data = await response.json();
      const schedulesData = data.results || data;
      setSchedules(schedulesData);
      
      // Convert to calendar events
      const events = schedulesData.map(schedule => ({
        id: schedule.id,
        title: schedule.form_type_display,
        start: schedule.filing_deadline,
        color: getEventColor(schedule.status),
        extendedProps: {
          schedule: schedule
        }
      }));
      setCalendarEvents(events);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const initializeYear = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/taxes/payroll/filing-schedule/initialize_year/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ year: selectedYear })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize year');
      }
      
      const result = await response.json();
      setShowInitDialog(false);
      fetchSchedules();
      
      if (result.created > 0) {
        // Show success message
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      upcoming: 'default',
      in_progress: 'warning',
      filed: 'success',
      late: 'error',
      extended: 'info'
    };
    return statusColors[status] || 'default';
  };

  const getEventColor = (status) => {
    const eventColors = {
      upcoming: '#2196f3',
      in_progress: '#ff9800',
      filed: '#4caf50',
      late: '#f44336',
      extended: '#9c27b0'
    };
    return eventColors[status] || '#757575';
  };

  const getDaysUntilDue = (deadline) => {
    return differenceInDays(parseISO(deadline), new Date());
  };

  const getUrgencyIcon = (daysUntil) => {
    if (daysUntil < 0) return <WarningIcon color="error" />;
    if (daysUntil <= 7) return <WarningIcon color="warning" />;
    if (daysUntil <= 30) return <InfoIcon color="info" />;
    return <CheckIcon color="success" />;
  };

  const renderScheduleSummary = () => {
    const upcoming = schedules.filter(s => s.status === 'upcoming').length;
    const inProgress = schedules.filter(s => s.status === 'in_progress').length;
    const filed = schedules.filter(s => s.status === 'filed').length;
    const late = schedules.filter(s => s.status === 'late').length;

    return (
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Upcoming
                  </Typography>
                  <Typography variant="h4">
                    {upcoming}
                  </Typography>
                </Box>
                <EventIcon color="primary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    In Progress
                  </Typography>
                  <Typography variant="h4">
                    {inProgress}
                  </Typography>
                </Box>
                <ScheduleIcon color="warning" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Filed
                  </Typography>
                  <Typography variant="h4">
                    {filed}
                  </Typography>
                </Box>
                <CheckIcon color="success" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Late
                  </Typography>
                  <Typography variant="h4">
                    {late}
                  </Typography>
                </Box>
                <WarningIcon color="error" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderTableView = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Form Type</TableCell>
            <TableCell>Period</TableCell>
            <TableCell>Filing Deadline</TableCell>
            <TableCell>Days Until Due</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Filed Date</TableCell>
            <TableCell>Confirmation</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {schedules.map((schedule) => {
            const daysUntil = getDaysUntilDue(schedule.filing_deadline);
            const quarterStr = schedule.quarter ? `Q${schedule.quarter}` : 'Annual';
            
            return (
              <TableRow key={schedule.id}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <FormIcon fontSize="small" />
                    {schedule.form_type_display}
                  </Box>
                </TableCell>
                <TableCell>
                  {quarterStr} {schedule.year}
                  {schedule.state_code && ` (${schedule.state_code})`}
                </TableCell>
                <TableCell>
                  {format(parseISO(schedule.filing_deadline), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getUrgencyIcon(daysUntil)}
                    {schedule.status !== 'filed' && (
                      <Typography variant="body2">
                        {daysUntil < 0 ? `${Math.abs(daysUntil)} days late` : `${daysUntil} days`}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={schedule.status_display}
                    color={getStatusColor(schedule.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {schedule.filed_date ? format(parseISO(schedule.filed_date), 'MM/dd/yyyy') : '-'}
                </TableCell>
                <TableCell>
                  {schedule.confirmation_number || '-'}
                </TableCell>
                <TableCell>
                  {schedule.status === 'upcoming' && (
                    <Tooltip title="Set Reminder">
                      <IconButton size="small">
                        <NotificationIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {schedules.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} align="center">
                No filing schedules found for {selectedYear}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderCalendarView = () => (
    <Paper sx={{ p: 2 }}>
      <FullCalendar
        plugins={[dayGridPlugin, listPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,listMonth'
        }}
        events={calendarEvents}
        eventClick={(info) => {
          const schedule = info.event.extendedProps.schedule;
          // Handle event click
        }}
        height="600px"
      />
    </Paper>
  );

  const renderUpcomingDeadlines = () => {
    const upcomingDeadlines = schedules
      .filter(s => s.status !== 'filed' && getDaysUntilDue(s.filing_deadline) >= 0)
      .sort((a, b) => new Date(a.filing_deadline) - new Date(b.filing_deadline))
      .slice(0, 5);

    if (upcomingDeadlines.length === 0) return null;

    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Upcoming Deadlines
          </Typography>
          <List>
            {upcomingDeadlines.map((schedule, index) => {
              const daysUntil = getDaysUntilDue(schedule.filing_deadline);
              
              return (
                <React.Fragment key={schedule.id}>
                  <ListItem>
                    <ListItemIcon>
                      {getUrgencyIcon(daysUntil)}
                    </ListItemIcon>
                    <ListItemText
                      primary={schedule.form_type_display}
                      secondary={`Due: ${format(parseISO(schedule.filing_deadline), 'MMMM d, yyyy')} (${daysUntil} days)`}
                    />
                  </ListItem>
                  {index < upcomingDeadlines.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </List>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">
          Tax Filing Schedule
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant={view === 'table' ? 'contained' : 'outlined'}
            onClick={() => setView('table')}
          >
            Table View
          </Button>
          <Button
            variant={view === 'calendar' ? 'contained' : 'outlined'}
            onClick={() => setView('calendar')}
          >
            Calendar View
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Year</InputLabel>
                <Select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  label="Year"
                >
                  {[...Array(5)].map((_, i) => {
                    const year = new Date().getFullYear() - 2 + i;
                    return <MenuItem key={year} value={year}>{year}</MenuItem>;
                  })}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Form Type</InputLabel>
                <Select
                  value={selectedFormType}
                  onChange={(e) => setSelectedFormType(e.target.value)}
                  label="Form Type"
                >
                  <MenuItem value="all">All Forms</MenuItem>
                  <MenuItem value="941">Form 941</MenuItem>
                  <MenuItem value="940">Form 940</MenuItem>
                  <MenuItem value="W2">Form W-2</MenuItem>
                  <MenuItem value="1099">Form 1099</MenuItem>
                  <MenuItem value="STATE_QUARTERLY">State Quarterly</MenuItem>
                  <MenuItem value="STATE_ANNUAL">State Annual</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setShowInitDialog(true)}
              >
                Initialize Year
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {renderScheduleSummary()}

      {/* Upcoming Deadlines */}
      {renderUpcomingDeadlines()}

      {/* Main Content */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        view === 'table' ? renderTableView() : renderCalendarView()
      )}

      {/* Initialize Year Dialog */}
      <Dialog
        open={showInitDialog}
        onClose={() => setShowInitDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Initialize Filing Schedule</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            This will create all standard tax filing deadlines for {selectedYear}
          </Alert>
          <Typography variant="body2">
            The following forms will be scheduled:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText primary="Form 941 - Quarterly (4 filings)" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Form 940 - Annual FUTA" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Form W-2 - Annual" />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInitDialog(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={initializeYear}
            disabled={loading}
          >
            Initialize {selectedYear}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FilingSchedule;