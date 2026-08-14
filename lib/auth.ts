import { betterAuth } from 'better-auth'
import { Pool } from 'pg'

// Valida se uma string e uma URL valida com protocolo http/https
function isValidHttpURL(s?: string): boolean {
  if (!s) return false
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

const getBaseURL = () => {
  // Usa BETTER_AUTH_URL so se for uma URL valida (evita erros com valores incorretos)
  if (isValidHttpURL(process.env.BETTER_AUTH_URL)) return process.env.BETTER_AUTH_URL!
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  if (isValidHttpURL(process.env.V0_RUNTIME_URL)) return process.env.V0_RUNTIME_URL!
  return 'http://localhost:3000'
}

const trustedOrigins = [
  isValidHttpURL(process.env.BETTER_AUTH_URL) ? process.env.BETTER_AUTH_URL : undefined,
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  isValidHttpURL(process.env.V0_RUNTIME_URL) ? process.env.V0_RUNTIME_URL : undefined,
  'http://localhost:3000',
  'https://orcafacilfrio.vercel.app',
  'https://orcafacil-5552.vercel.app',
].filter(Boolean) as string[]

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  baseURL: getBaseURL(),
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: 'none' as const,
      secure: true,
    },
    // Aceita qualquer subdominio do Vercel (previews, branches, etc.)
    crossSubDomainCookies: {
      enabled: false,
    },
  },
})
