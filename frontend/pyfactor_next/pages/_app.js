// /Users/kuoldeng/projectx/frontend/pyfactor_next/pages/_app.js
import '@/src/app/globals.css';
import { UserMessageProvider } from '@/contexts/UserMessageContext';


function MyApp({ Component, pageProps }) {
  return (
    <UserMessageProvider>
      <Component {...pageProps} />
    </UserMessageProvider>
  );
}

export default MyApp;