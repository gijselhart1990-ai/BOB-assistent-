type Configuratie = Record<string, string | undefined>;

export function isPreview(config: Configuratie) {
  return config.VERCEL_ENV === 'preview' || config.CONTEXT === 'deploy-preview' || config.CONTEXT === 'branch-deploy';
}

/** Preview erft in hosting vaak productiesecrets. Externe koppelingen blijven daarom uit tot testaccounts zijn ingesteld. */
export function deploymentConfiguratie(bron: Configuratie): Configuratie {
  const config = { ...bron };
  if (isPreview(bron) && bron.BOB_PREVIEW_INTEGRATIONS !== 'enabled') {
    for (const naam of Object.keys(config)) {
      if (/^(XANO_|GOOGLE_|MICROSOFT_|TODOIST_|ANTHROPIC_|CARTESIA_|BRAVE_|LINKEDIN_|INSTAGRAM_|FACEBOOK_|TIKTOK_|RESEND_|SENDGRID_)/.test(naam)) config[naam] = '';
    }
  }
  return config;
}

export function opslagOmgeving(config: Configuratie): string | null {
  if (!isPreview(config)) return null;
  return config.VERCEL_GIT_COMMIT_REF || config.HEAD || config.BRANCH || config.VERCEL_URL || config.DEPLOY_ID || 'preview';
}
