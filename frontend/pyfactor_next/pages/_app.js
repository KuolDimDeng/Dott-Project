// /Users/kuoldeng/projectx/frontend/pyfactor_next/pages/_app.js
import '@app/globals.css';
import { UserMessageProvider } from '@contexts/userMessageContext';

function MyApp({ Component, pageProps }) {
  return (
    <UserMessageProvider>
      <Component {...pageProps} />
    </UserMessageProvider>
  );
}

export default MyApp;