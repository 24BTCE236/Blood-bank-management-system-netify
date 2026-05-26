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

const donors = (() => {
  const firstNames = ['Aarav','Sahana','Imran','Riya','Karan','Priya','Rahul','Ananya','Vikram','Meera','Arjun','Sneha','Rohit','Isha','Sameer','Nidhi','Aditya','Sara','Rakesh','Pooja','Vimal','Divya','Kavya','Deepak','Anil','Maya','Tarun','Leena','Manish','Rohan'];
  const lastNames = ['Mehta','Reddy','Khan','Sharma','Patel','Gupta','Nair','Iyer','Das','Bose','Saxena','Nair','Rao','Joshi','Kumar','Singh','Chowdhury','Desai','Menon','Thomas'];
  const streets = ['MG Road','Church Street','Brigade Road','Indira Nagar','Koramangala','Salt Lake','Colaba','Bandra West','Jayanagar','Powai','Kondapur','T Nagar','Noida Sector 18','HSR Layout','Gachibowli'];
  const cities = ['Mumbai','Bengaluru','Hyderabad','Chennai','Kolkata','Pune','Ahmedabad','Jaipur','Lucknow','Thiruvananthapuram','Kochi','Bhopal'];
  const medicalPool = ['No fever','No antibiotics','No recent surgery','Healthy hemoglobin','No smoking','No alcohol in last 24 hours','No chronic illness','No vaccination in last 7 days'];

  const rand = (seed: number) => {
    // simple LCG for deterministic pseudo-randomness per index
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) % 0x100000000;
      return s / 0x100000000;
    };
  };

  const makeDatePast = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0,10);
  };

  const list: any[] = [];
  const total = 100;
  for (let i = 1; i <= total; i++) {
    const r = rand(i);
    const fn = firstNames[Math.floor(r()*firstNames.length)];
    const ln = lastNames[Math.floor(r()*lastNames.length)];
    const name = `${fn} ${ln}`;
    const age = 18 + Math.floor(r()*48); // 18-65
    const weight = 50 + Math.floor(r()*50); // 50-99
    const street = streets[Math.floor(r()*streets.length)];
    const city = cities[Math.floor(r()*cities.length)];
    const address = `${Math.floor(r()*200)+1}, ${street}, ${city}`;
    const bloodGroup = (['A+','A-','B+','B-','AB+','AB-','O+','O-'] as BloodGroup[])[Math.floor(r()*8)];
    const daysSince = Math.floor(r()*1000) + 1;
    const lastDonationDate = makeDatePast(daysSince);
    // pick 3 medical eligibility items
    const eligible: string[] = [];
    const pool = [...medicalPool];
    while (eligible.length < 3 && pool.length > 0) {
      const idx = Math.floor(r()*pool.length);
      eligible.push(pool.splice(idx,1)[0]);
    }
    const id = `donor-${i.toString().padStart(3,'0')}`;
    const createdAt = new Date(Date.now() - i * 1000 * 60 * 60).toISOString();
    const contact = `+91 9${Math.floor(100000000 + r()*900000000)}`;

    list.push({
      id,
      name,
      age,
      bloodGroup,
      weight,
      lastDonationDate,
      contact,
      medicalEligibility: eligible,
      active: true,
      createdAt,
      address,
    });
  }

  return list;
})();

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
