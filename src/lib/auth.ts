import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPassword } from '@/lib/crypto'
import type { UserRole } from '@/types'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'E-Mail', type: 'email' },
        password: { label: 'Passwort', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const { data: user, error } = await supabaseAdmin
          .from('compliance_users')
          .select('*')
          .eq('email', credentials.email.toLowerCase().trim())
          .single()

        if (error || !user) return null

        const isValid = await verifyPassword(credentials.password, user.password_hash)
        if (!isValid) return null

        // Letzten Login-Zeitpunkt aktualisieren (Fehler ignorieren)
        await supabaseAdmin
          .from('compliance_users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', user.id)

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          organizationId: user.organization_id,
          role: user.role as UserRole,
        }
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 Stunden
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.organizationId = user.organizationId
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id
      session.user.organizationId = token.organizationId
      session.user.role = token.role
      return session
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },
}
