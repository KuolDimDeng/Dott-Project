//Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/update-session.js
import { getSession } from "next-auth/react";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { accessToken, refreshToken } = req.body;

  // Update the session
  session.user.accessToken = accessToken;
  session.user.refreshToken = refreshToken;

  res.status(200).json({ message: 'Session updated successfully' });
}
