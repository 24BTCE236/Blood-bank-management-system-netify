export const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export type BloodGroup = (typeof bloodGroups)[number];

export type ThemeMode = 'dark' | 'light';

export type Founder = {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
  accent: string;
  description: string;
  passwordSalt: string;
  passwordHash: string;
};

export type InventoryRecord = {
  group: BloodGroup;
  liters: number;
  capacity: number;
  updatedAt: string;
};

export type Donor = {
  id: string;
  name: string;
  age: number;
  address?: string;
  bloodGroup: BloodGroup;
  weight: number;
  lastDonationDate: string;
  contact: string;
  medicalEligibility: string[];
  active: boolean;
  createdAt: string;
};

export type BloodRequest = {
  id: string;
  requesterName: string;
  institution: string;
  bloodGroup: BloodGroup;
  units: number;
  priority: 'Critical' | 'Urgent' | 'Standard';
  location: string;
  contact: string;
  note: string;
  status: 'pending' | 'approved' | 'dispatched' | 'fulfilled';
  createdAt: string;
  matchedDonorIds: string[];
};

export type BloodBankState = {
  founders: Founder[];
  currentFounderId: string | null;
  inventory: Record<BloodGroup, InventoryRecord>;
  donors: Donor[];
  requests: BloodRequest[];
  livesSaved: number;
  activeView: 'overview' | 'donors' | 'requests';
  theme: ThemeMode;
};

export const bloodBagSizeLiters = 0.45;

export const compatibilityMap: Record<BloodGroup, BloodGroup[]> = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'],
};

export const donorsMatchRequest = (donor: Donor, requestGroup: BloodGroup) =>
  compatibilityMap[requestGroup].includes(donor.bloodGroup) && donor.active;

export const calculateDonorEligibility = (form: {
  age: number;
  weight: number;
  lastDonationDate: string;
  medicalEligibility: string[];
}) => {
  const lastDonationAge = Number.isNaN(Date.parse(form.lastDonationDate))
    ? Number.POSITIVE_INFINITY
    : (Date.now() - Date.parse(form.lastDonationDate)) / (1000 * 60 * 60 * 24);

  const criteriaMet =
    form.age >= 18 &&
    form.age <= 65 &&
    form.weight >= 50 &&
    lastDonationAge >= 90 &&
    form.medicalEligibility.length > 0;

  return criteriaMet;
};

export const formatLiters = (liters: number) => `${liters.toFixed(1)} L`;

export const requestUnitsToLiters = (units: number) => Number((units * bloodBagSizeLiters).toFixed(2));

export const clampLiters = (value: number, capacity: number) => Math.max(0, Math.min(capacity, Number(value.toFixed(2))));

export const stockPercent = (liters: number, capacity: number) => Math.max(0, Math.min(100, (liters / capacity) * 100));
