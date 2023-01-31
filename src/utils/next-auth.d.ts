import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      role: 'user' | 'admin';
      id: string;
      name: string;
      email: string;
    } & DefaultSession['user'];
  }
}
