// Minimal NextAuth style configuration referenced by AUTH-1.
import NextAuth from "next-auth";

export const authOptions = {
  providers: [],
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
