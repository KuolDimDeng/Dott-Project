///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import { authOptions } from "./options";

console.log("NextAuth route handler loaded.");
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };