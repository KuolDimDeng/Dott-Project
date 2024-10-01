import '@app/globals.css';
import { UserMessageProvider } from '@contexts/userMessageContext';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '@src/styles/theme';

function MyApp({ Component, pageProps }) {
  return (
    <UserMessageProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Component {...pageProps} />
      </ThemeProvider>
    </UserMessageProvider>
  );
}

export default MyApp;