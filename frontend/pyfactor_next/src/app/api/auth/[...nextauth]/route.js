// src/app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import { authOptions } from "./options";
import { logger } from '@/utils/logger';

logger.info("NextAuth configuration loaded.");

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };