// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import { options } from "./options";

console.log("NextAuth Options:", JSON.stringify(options, null, 2));

const handler = NextAuth(options);

export { handler as GET, handler as POST };