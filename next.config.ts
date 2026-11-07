import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // knex lazily requires every SQL driver; keep it (and mysql2) out of the bundle.
  serverExternalPackages: ['knex', 'mysql2'],
  poweredByHeader: false,
}

export default nextConfig
