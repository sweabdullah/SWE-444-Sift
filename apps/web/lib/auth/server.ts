import "server-only";
import NextAuth from "next-auth";
import { prisma } from "@sift/db";
import { createAuthConfig } from "./config";
export const { handlers, auth, signIn } = NextAuth(createAuthConfig(prisma));
