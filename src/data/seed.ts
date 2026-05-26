import type { BloodBankState, BloodGroup, Founder } from '../lib/blood';
import { bloodBagSizeLiters, clampLiters } from '../lib/blood';

const founders: Founder[] = [
  {
    id: 'founder-1',
    name: 'Niharika.K.N',
    email: 'niharika@bloodbank.local',
    role: 'Project Director',
    initials: 'NK',
    accent: 'from-blood-500 to-rose-400',
    description: 'Sets the product vision and keeps the platform aligned with life-saving outcomes.',
    passwordSalt: 'nk-founder-salt',
    passwordHash: '7c8f26feb7873ccac2f15c0679cf9ef721aed6da1bfb6de9a20eb1c2dc6a0f5c',
  },
  {
    id: 'founder-2',
    name: 'Lakshitha Bojja',
    email: 'lakshitha@bloodbank.local',
    role: 'Operations Head',
    initials: 'LB',
    accent: 'from-slate-400 to-slate-200',
    description: 'Coordinates workflows, approvals, and response readiness across the network.',
    passwordSalt: 'lb-founder-salt',
    passwordHash: '15b1d8b95f8f6f496c45019841dda3a15fb94cd3bf459ef25a964b39a3def776',
  },
  {
    id: 'founder-3',
    name: 'Navya',
    email: 'navya@bloodbank.local',
    role: 'Technical Lead',
    initials: 'NV',
    accent: 'from-red-500 to-orange-400',
    description: 'Drives the front-end architecture, state orchestration, and interaction quality.',
    passwordSalt: 'nv-founder-salt',
    passwordHash: '51d8183dc7845bf488b147853926608d8254a230d7e636fe1832c14e940f00b6',
  },
  {
    id: 'founder-4',
    name: 'Jyothi Priya',
    email: 'jyothi@bloodbank.local',
    role: 'Database Architect',
    initials: 'JP',
    accent: 'from-slate-300 to-slate-500',
    description: 'Designs the resilient data model and local persistence strategy for offline use.',
    passwordSalt: 'jp-founder-salt',
    passwordHash: 'a509f9641e4b055d0f1a1e032494cf4cf15fbbb71f4a7379721b53921219a58f',
  },
];

const inventorySeed: Record<BloodGroup, number> = {
  'A+': 10.8,
  'A-': 5.4,
  'B+': 9.9,
  'B-': 3.6,
  'AB+': 4.5,
  'AB-': 2.7,
  'O+': 12.6,
  'O-': 6.3,
};

const makeInventory = () =>
  Object.entries(inventorySeed).reduce<BloodBankState['inventory']>((accumulator, [group, liters]) => {
    const bloodGroup = group as BloodGroup;
    accumulator[bloodGroup] = {
      group: bloodGroup,
      liters: clampLiters(liters, 40),
      capacity: 40,
      updatedAt: new Date().toISOString(),
    };
    return accumulator;
  }, {} as BloodBankState['inventory']);

const donors = [
  {
    id: 'donor-1',
    name: 'Aarav Mehta',
    age: 29,
    bloodGroup: 'O+' as BloodGroup,
    weight: 71,
    lastDonationDate: '2025-09-12',
    contact: '+91 98765 43210',
    medicalEligibility: ['No smoking', 'No fever', 'Healthy hemoglobin'],
    active: true,
    createdAt: '2026-04-18T10:20:00.000Z',
  },
  {
    id: 'donor-2',
    name: 'Sahana Reddy',
    age: 34,
    bloodGroup: 'A+' as BloodGroup,
    weight: 63,
    lastDonationDate: '2025-08-04',
    contact: '+91 91234 56780',
    medicalEligibility: ['No antibiotics', 'No chronic illness'],
    active: true,
    createdAt: '2026-04-19T12:20:00.000Z',
  },
  {
    id: 'donor-3',
    name: 'Imran Khan',
    age: 41,
    bloodGroup: 'B+' as BloodGroup,
    weight: 77,
    lastDonationDate: '2025-10-30',
    contact: '+91 99880 77110',
    medicalEligibility: ['No recent surgery', 'No vaccination in last 7 days'],
    active: true,
    createdAt: '2026-04-20T07:12:00.000Z',
  },
];

const requests = [
  {
    id: 'req-1',
    requesterName: 'Apollo Emergency Desk',
    institution: 'Apollo Hospital',
    bloodGroup: 'O-' as BloodGroup,
    units: 3,
    priority: 'Critical' as const,
    location: 'Hyderabad',
    contact: '+91 90000 12000',
    note: 'Trauma response required within the hour.',
    status: 'pending' as const,
    createdAt: '2026-05-24T16:40:00.000Z',
    matchedDonorIds: [],
  },
  {
    id: 'req-2',
    requesterName: 'City Care Ward',
    institution: 'City Care Hospital',
    bloodGroup: 'A+' as BloodGroup,
    units: 2,
    priority: 'Urgent' as const,
    location: 'Bengaluru',
    contact: '+91 90000 12001',
    note: 'Pre-operative demand for a scheduled transplant.',
    status: 'pending' as const,
    createdAt: '2026-05-24T18:10:00.000Z',
    matchedDonorIds: [],
  },
];

export const createSeedState = (): BloodBankState => ({
  founders,
  currentFounderId: null,
  inventory: makeInventory(),
  donors,
  requests,
  livesSaved: Math.round((Object.values(inventorySeed).reduce((sum, liters) => sum + liters, 0) / bloodBagSizeLiters) * 2),
  activeView: 'donors',
  theme: 'dark',
});
