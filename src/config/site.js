import accountConfig from './site-data.json'

export const siteConfig = {
  name: '26068705g',
  title: '26068705g | Information Technology & AI Systems',
  description:
    'Personal homepage of a PolyU Information Technology student exploring backend systems, AI agents, and thoughtful technology.',
  email: '26068705g@connect.polyu.hk',
  githubUsername: accountConfig.githubUsername,
  leetcodeUsername: accountConfig.leetcodeUsername,
  giscus: {
    repo: 'xixi-in-polyu/comp5241_demo',
    repoId: import.meta.env.PUBLIC_GISCUS_REPO_ID || '',
    category: import.meta.env.PUBLIC_GISCUS_CATEGORY || 'Announcements',
    categoryId: import.meta.env.PUBLIC_GISCUS_CATEGORY_ID || '',
  },
}

export function withBase(path = '/') {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${base}${suffix}`.replace(/\/+/g, '/')
}
