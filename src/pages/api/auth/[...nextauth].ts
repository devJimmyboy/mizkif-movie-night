import { AppProviders } from 'next-auth/providers';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '../../../server/prisma';
import TwitchProvider from 'next-auth/providers/twitch';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import NextAuth from 'next-auth/next';

const { TWITCH_CLIENT_ID, TWITCH_SECRET, NODE_ENV, APP_ENV } = process.env;
const providers: AppProviders = [];

providers.push(
  TwitchProvider({
    clientId: TWITCH_CLIENT_ID!,
    clientSecret: TWITCH_SECRET!,
    profile(profile) {
      console.log('profile', profile);
      return {
        id: profile.sub,
        name: profile.preferred_username,
        email: profile.email,
        image: profile.picture,
      } as any;
    },
  }),
);

const admins = ['devjimmyboy', 'anthonyc0la'];

export default NextAuth({
  adapter: PrismaAdapter(prisma),
  // Configure one or more authentication providers
  providers,
  callbacks: {
    session({ session, token, user }) {
      if (user) {
        const isAdmin = admins.includes(user.name?.toLowerCase() ?? '');
        session.user = {
          email: user.email!,
          name: user.name!,
          id: user.id!,
          image: user.image!,
          role: isAdmin ? 'admin' : 'user',
        };
      }
      return session;
    },
  },
});
