import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // knex lazily requires every SQL driver; keep it (and mysql2) out of the bundle.
  // speech-rule-engine reads its locale files from node_modules at runtime.
  serverExternalPackages: ['knex', 'mysql2', 'speech-rule-engine'],
  // Speech Rule Engine reads these at runtime, so tracing can't see them; ship English + base only.
  outputFileTracingIncludes: {
    '/learn/**': ['./node_modules/speech-rule-engine/lib/mathmaps/base.json', './node_modules/speech-rule-engine/lib/mathmaps/en.json'],
    '/exam/**': ['./node_modules/speech-rule-engine/lib/mathmaps/base.json', './node_modules/speech-rule-engine/lib/mathmaps/en.json'],
  },
  poweredByHeader: false,
}

export default nextConfig
