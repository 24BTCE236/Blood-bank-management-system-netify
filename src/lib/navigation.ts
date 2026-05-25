export type DashboardSection = 'overview' | 'donors' | 'requests';

export const sectionToPath = (section: DashboardSection) => `/${section}`;

export const pathToSection = (pathname: string): DashboardSection | null => {
  if (pathname === '/donors') return 'donors';
  if (pathname === '/requests') return 'requests';
  if (pathname === '/overview') return 'overview';
  return null;
};
