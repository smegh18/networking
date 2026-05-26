/**
 * Seed script — populates Firebase Realtime Database with demo data.
 * Run:  node scripts/seed-rtdb.js
 */

const RTDB_URL = 'https://bbcn-networking-default-rtdb.firebaseio.com';

const now = new Date().toISOString();
const today = now.split('T')[0];

// Helper: date N days from now
function futureDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
function pastDate(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

// ── Zones ──
const zones = {
  zone001: { name: 'West Zone', region: 'Gujarat', chapterCount: 2 },
  zone002: { name: 'Central Zone', region: 'Maharashtra', chapterCount: 1 },
};

// ── Chapters ──
const chapters = {
  chapter001: {
    name: 'Ahmedabad Business Club',
    zoneId: 'zone001',
    location: { city: 'Ahmedabad', state: 'Gujarat' },
    memberCount: 5,
    createdAt: pastDate(180),
  },
  chapter002: {
    name: 'Surat Entrepreneurs Hub',
    zoneId: 'zone001',
    location: { city: 'Surat', state: 'Gujarat' },
    memberCount: 3,
    createdAt: pastDate(120),
  },
  chapter003: {
    name: 'Mumbai Biz Network',
    zoneId: 'zone002',
    location: { city: 'Mumbai', state: 'Maharashtra' },
    memberCount: 2,
    createdAt: pastDate(90),
  },
};

// ── Users (members) ──
const users = {
  user001: {
    email: 'rajesh.patel@example.com',
    name: 'Rajesh Patel',
    phone: '+919876543210',
    photoURL: '',
    businessName: 'Patel Textiles Pvt Ltd',
    businessDescription: 'Premium fabric wholesale and retail. Specialized in silk and cotton.',
    businessCategory: 'Textile & Garments',
    businessTags: ['Wholesale', 'Retail', 'Supplier'],
    businessPhotos: [],
    services: ['Supply Chain Management'],
    businessAddress: '123 Ring Road, Ahmedabad',
    socialLinks: { instagram: '@pateltextiles', facebook: 'pateltextiles', whatsapp: '+919876543210', linkedin: 'rajeshpatel', google: '' },
    chapterId: 'chapter001',
    zoneId: 'zone001',
    location: { city: 'Ahmedabad', state: 'Gujarat' },
    dateOfBirth: '1985-03-15',
    language: 'en',
    biometricEnabled: false,
    role: 'member',
    isActive: true,
    createdAt: pastDate(150),
    updatedAt: now,
  },
  user002: {
    email: 'priya.shah@example.com',
    name: 'Priya Shah',
    phone: '+919876543211',
    photoURL: '',
    businessName: 'Shah IT Solutions',
    businessDescription: 'Web development, mobile apps, and cloud consulting for SMEs.',
    businessCategory: 'Technology',
    businessTags: ['B2B', 'Services', 'Consultant'],
    businessPhotos: [],
    services: ['Web Development', 'Mobile App Development', 'Cloud Services'],
    businessAddress: '45 SG Highway, Ahmedabad',
    socialLinks: { instagram: '@shahit', facebook: 'shahitsolutions', whatsapp: '+919876543211', linkedin: 'priyashah', google: '' },
    chapterId: 'chapter001',
    zoneId: 'zone001',
    location: { city: 'Ahmedabad', state: 'Gujarat' },
    dateOfBirth: '1990-07-22',
    language: 'en',
    biometricEnabled: false,
    role: 'member',
    isActive: true,
    createdAt: pastDate(140),
    updatedAt: now,
  },
  user003: {
    email: 'amit.desai@example.com',
    name: 'Amit Desai',
    phone: '+919876543212',
    photoURL: '',
    businessName: 'Desai Construction Co.',
    businessDescription: 'Residential and commercial construction projects across Gujarat.',
    businessCategory: 'Construction',
    businessTags: ['B2B', 'Manufacturer'],
    businessPhotos: [],
    services: ['Interior Design'],
    businessAddress: '78 Industrial Area, Surat',
    socialLinks: { instagram: '@desaiconstruction', facebook: 'desaiconstruction', whatsapp: '+919876543212', linkedin: 'amitdesai', google: '' },
    chapterId: 'chapter002',
    zoneId: 'zone001',
    location: { city: 'Surat', state: 'Gujarat' },
    dateOfBirth: '1982-11-05',
    language: 'gu',
    biometricEnabled: false,
    role: 'member',
    isActive: true,
    createdAt: pastDate(100),
    updatedAt: now,
  },
  user004: {
    email: 'neha.mehta@example.com',
    name: 'Neha Mehta',
    phone: '+919876543213',
    photoURL: '',
    businessName: 'Mehta Legal Associates',
    businessDescription: 'Corporate law, compliance, and business advisory services.',
    businessCategory: 'Legal Services',
    businessTags: ['Services', 'Consultant'],
    businessPhotos: [],
    services: ['Legal Advisory'],
    businessAddress: '12 Law Garden, Ahmedabad',
    socialLinks: { instagram: '', facebook: 'mehtalegal', whatsapp: '+919876543213', linkedin: 'nehamehta', google: '' },
    chapterId: 'chapter001',
    zoneId: 'zone001',
    location: { city: 'Ahmedabad', state: 'Gujarat' },
    dateOfBirth: '1988-01-30',
    language: 'hi',
    biometricEnabled: false,
    role: 'member',
    isActive: true,
    createdAt: pastDate(80),
    updatedAt: now,
  },
  user005: {
    email: 'vikram.joshi@example.com',
    name: 'Vikram Joshi',
    phone: '+919876543214',
    photoURL: '',
    businessName: 'Joshi Finance & Investments',
    businessDescription: 'Mutual funds, insurance, and financial planning for individuals and businesses.',
    businessCategory: 'Finance & Banking',
    businessTags: ['Services', 'Consultant', 'Investor'],
    businessPhotos: [],
    services: ['Financial Planning', 'Insurance Services'],
    businessAddress: '90 FC Road, Mumbai',
    socialLinks: { instagram: '@joshifinance', facebook: 'joshifinance', whatsapp: '+919876543214', linkedin: 'vikramjoshi', google: '' },
    chapterId: 'chapter003',
    zoneId: 'zone002',
    location: { city: 'Mumbai', state: 'Maharashtra' },
    dateOfBirth: '1979-09-18',
    language: 'en',
    biometricEnabled: false,
    role: 'member',
    isActive: true,
    createdAt: pastDate(60),
    updatedAt: now,
  },
  user006: {
    email: 'anita.sharma@example.com',
    name: 'Anita Sharma',
    phone: '+919876543215',
    photoURL: '',
    businessName: 'Sharma Marketing Agency',
    businessDescription: 'Digital marketing, SEO, and social media management for brands.',
    businessCategory: 'Marketing & Advertising',
    businessTags: ['Services', 'Freelancer', 'B2B'],
    businessPhotos: [],
    services: ['Digital Marketing', 'SEO & SEM', 'Content Writing'],
    businessAddress: '56 MG Road, Surat',
    socialLinks: { instagram: '@sharmamarketing', facebook: 'sharmaagency', whatsapp: '+919876543215', linkedin: 'anitasharma', google: '' },
    chapterId: 'chapter002',
    zoneId: 'zone001',
    location: { city: 'Surat', state: 'Gujarat' },
    dateOfBirth: '1993-05-12',
    language: 'en',
    biometricEnabled: false,
    role: 'member',
    isActive: true,
    createdAt: pastDate(45),
    updatedAt: now,
  },
  user007: {
    email: 'karan.modi@example.com',
    name: 'Karan Modi',
    phone: '+919876543216',
    photoURL: '',
    businessName: 'Modi Pharma Distributors',
    businessDescription: 'Pharmaceutical distribution and wholesale supply chain.',
    businessCategory: 'Pharmaceuticals',
    businessTags: ['Wholesale', 'Distributor', 'B2B'],
    businessPhotos: [],
    services: ['Supply Chain Management', 'Logistics & Transport'],
    businessAddress: '34 GIDC Estate, Ahmedabad',
    socialLinks: { instagram: '', facebook: 'modipharma', whatsapp: '+919876543216', linkedin: 'karanmodi', google: '' },
    chapterId: 'chapter001',
    zoneId: 'zone001',
    location: { city: 'Ahmedabad', state: 'Gujarat' },
    dateOfBirth: '1986-12-08',
    language: 'gu',
    biometricEnabled: false,
    role: 'member',
    isActive: true,
    createdAt: pastDate(30),
    updatedAt: now,
  },
  user008: {
    email: 'deepa.nair@example.com',
    name: 'Deepa Nair',
    phone: '+919876543217',
    photoURL: '',
    businessName: 'Nair Foods & Catering',
    businessDescription: 'Catering services for corporate events and weddings.',
    businessCategory: 'Food & Beverage',
    businessTags: ['Services', 'B2B', 'Retail'],
    businessPhotos: [],
    services: ['Event Management'],
    businessAddress: '22 Juhu Beach Road, Mumbai',
    socialLinks: { instagram: '@nairfoods', facebook: 'naircatering', whatsapp: '+919876543217', linkedin: 'deepanair', google: '' },
    chapterId: 'chapter003',
    zoneId: 'zone002',
    location: { city: 'Mumbai', state: 'Maharashtra' },
    dateOfBirth: '1991-04-25',
    language: 'en',
    biometricEnabled: false,
    role: 'member',
    isActive: true,
    createdAt: pastDate(20),
    updatedAt: now,
  },
};

// ── Events ──
const events = {
  event001: {
    title: 'Monthly Business Networking Mixer',
    description: 'Join us for our monthly networking event where members share business updates and referrals.',
    date: futureDate(7),
    time: '18:00',
    location: 'Hotel Grand, Ahmedabad',
    organizer: 'user001',
    organizerName: 'Rajesh Patel',
    chapterId: 'chapter001',
    type: 'event',
    attendees: ['user001', 'user002', 'user004', 'user007'],
    imageURL: '',
    createdAt: pastDate(5),
  },
  event002: {
    title: 'Digital Marketing Webinar',
    description: 'Learn the latest SEO and social media strategies to grow your business online.',
    date: futureDate(14),
    time: '15:00',
    location: 'Online (Zoom)',
    organizer: 'user006',
    organizerName: 'Anita Sharma',
    chapterId: 'chapter002',
    type: 'webinar',
    attendees: ['user003', 'user006'],
    imageURL: '',
    createdAt: pastDate(3),
  },
  event003: {
    title: 'B2B Connect — Finance & Legal',
    description: 'Focused networking for finance and legal professionals to exchange referrals.',
    date: futureDate(21),
    time: '10:00',
    location: 'ITC Maratha, Mumbai',
    organizer: 'user005',
    organizerName: 'Vikram Joshi',
    chapterId: 'chapter003',
    type: 'meeting',
    attendees: ['user005', 'user008'],
    imageURL: '',
    createdAt: pastDate(2),
  },
  event004: {
    title: 'Annual Gala & Awards Night',
    description: 'Celebrating the top referral givers and business achievers of the year.',
    date: futureDate(45),
    time: '19:00',
    location: 'Taj Vivanta, Ahmedabad',
    organizer: 'user001',
    organizerName: 'Rajesh Patel',
    chapterId: 'chapter001',
    type: 'event',
    attendees: [],
    imageURL: '',
    createdAt: pastDate(1),
  },
};

// ── Meetings ──
const meetings = {
  meeting001: {
    requesterId: 'user001',
    requesterName: 'Rajesh Patel',
    requesteeId: 'user002',
    requesteeName: 'Priya Shah',
    type: 'one_on_one',
    status: 'accepted',
    scheduledDate: futureDate(3),
    scheduledTime: '11:00',
    notes: 'Discuss website redesign for Patel Textiles',
    createdAt: pastDate(2),
  },
  meeting002: {
    requesterId: 'user005',
    requesterName: 'Vikram Joshi',
    requesteeId: 'user004',
    requesteeName: 'Neha Mehta',
    type: 'one_on_one',
    status: 'pending',
    scheduledDate: futureDate(5),
    scheduledTime: '14:30',
    notes: 'Explore partnership for client compliance services',
    createdAt: pastDate(1),
  },
  meeting003: {
    requesterId: 'user003',
    requesterName: 'Amit Desai',
    requesteeId: 'user007',
    requesteeName: 'Karan Modi',
    type: 'one_on_one',
    status: 'completed',
    scheduledDate: pastDate(5),
    scheduledTime: '16:00',
    notes: 'Pharma warehouse construction quote',
    createdAt: pastDate(10),
  },
};

// ── Referrals ──
const referrals = {
  ref001: {
    giverId: 'user001',
    giverName: 'Rajesh Patel',
    receiverId: 'user002',
    receiverName: 'Priya Shah',
    businessDescription: 'Need a company website and mobile app for textile catalog',
    contactName: 'Suresh Bhai',
    contactPhone: '+919998887770',
    status: 'completed',
    amount: 250000,
    createdAt: pastDate(30),
  },
  ref002: {
    giverId: 'user004',
    giverName: 'Neha Mehta',
    receiverId: 'user005',
    receiverName: 'Vikram Joshi',
    businessDescription: 'Client needs financial planning and mutual fund advisory',
    contactName: 'Ramesh Agarwal',
    contactPhone: '+919998887771',
    status: 'contacted',
    amount: 500000,
    createdAt: pastDate(15),
  },
  ref003: {
    giverId: 'user006',
    giverName: 'Anita Sharma',
    receiverId: 'user003',
    receiverName: 'Amit Desai',
    businessDescription: 'Restaurant chain wants to build 3 new outlets in Surat',
    contactName: 'Jayesh Thakkar',
    contactPhone: '+919998887772',
    status: 'pending',
    amount: 1500000,
    createdAt: pastDate(7),
  },
  ref004: {
    giverId: 'user002',
    giverName: 'Priya Shah',
    receiverId: 'user006',
    receiverName: 'Anita Sharma',
    businessDescription: 'Tech startup needs social media marketing campaign',
    contactName: 'Rohan Kapoor',
    contactPhone: '+919998887773',
    status: 'completed',
    amount: 180000,
    createdAt: pastDate(45),
  },
  ref005: {
    giverId: 'user007',
    giverName: 'Karan Modi',
    receiverId: 'user001',
    receiverName: 'Rajesh Patel',
    businessDescription: 'Hospital chain needs uniform fabric supply contract',
    contactName: 'Dr. Pankaj Mishra',
    contactPhone: '+919998887774',
    status: 'pending',
    amount: 800000,
    createdAt: pastDate(3),
  },
};

// ── Ads ──
const ads = {
  ad001: {
    userId: 'user001',
    businessName: 'Patel Textiles Pvt Ltd',
    imageURL: '',
    title: 'Diwali Collection — 30% Off on Silk Sarees!',
    description: 'Exclusive festive season discounts on premium silk and cotton fabrics. Visit our showroom today.',
    active: true,
    createdAt: pastDate(10),
    expiresAt: futureDate(30),
  },
  ad002: {
    userId: 'user002',
    businessName: 'Shah IT Solutions',
    imageURL: '',
    title: 'Get Your Business Online — Website in 7 Days',
    description: 'Professional websites starting at ₹25,000. Mobile apps, e-commerce, and cloud solutions.',
    active: true,
    createdAt: pastDate(5),
    expiresAt: futureDate(60),
  },
  ad003: {
    userId: 'user005',
    businessName: 'Joshi Finance & Investments',
    imageURL: '',
    title: 'Tax Saving Season — Invest Smart!',
    description: 'Expert financial planning and mutual fund advisory. Free consultation for NetConnect members.',
    active: true,
    createdAt: pastDate(2),
    expiresAt: futureDate(45),
  },
};

// ── Asks ──
const asks = {
  ask001: {
    service: 'Website Development',
    category: 'Technology',
    description: 'Looking for a reliable web developer to build an e-commerce site for our garment business.',
    askerName: 'Rajesh Patel',
    askerUid: 'user001',
    askerBusinessName: 'Patel Textiles Pvt Ltd',
    askerPhone: '+919876543210',
    askerWhatsapp: '+919876543210',
    createdAt: pastDate(8),
  },
  ask002: {
    service: 'Interior Designer',
    category: 'Construction',
    description: 'Need an interior designer for a 5000 sq ft commercial office space in Surat.',
    askerName: 'Amit Desai',
    askerUid: 'user003',
    askerBusinessName: 'Desai Construction Co.',
    askerPhone: '+919876543212',
    askerWhatsapp: '+919876543212',
    createdAt: pastDate(6),
  },
  ask003: {
    service: 'Catering Service',
    category: 'Food & Beverage',
    description: 'Looking for catering for a corporate event of 200 people in Ahmedabad.',
    askerName: 'Neha Mehta',
    askerUid: 'user004',
    askerBusinessName: 'Mehta Legal Associates',
    askerPhone: '+919876543213',
    askerWhatsapp: '+919876543213',
    createdAt: pastDate(4),
  },
  ask004: {
    service: 'Chartered Accountant',
    category: 'Finance & Banking',
    description: 'Need a CA for GST filing and annual audit for our pharma distribution business.',
    askerName: 'Karan Modi',
    askerUid: 'user007',
    askerBusinessName: 'Modi Pharma Distributors',
    askerPhone: '+919876543216',
    askerWhatsapp: '+919876543216',
    createdAt: pastDate(2),
  },
};

// ── Notifications ──
const notifications = {
  notif001: {
    userId: 'user002',
    type: 'meeting',
    title: 'New Meeting Invite',
    body: 'Rajesh Patel invited you for a meeting on ' + futureDate(3) + ' at 11:00 AM',
    data: { meetingId: 'meeting001' },
    read: true,
    createdAt: pastDate(2),
  },
  notif002: {
    userId: 'user004',
    type: 'meeting',
    title: 'New Meeting Invite',
    body: 'Vikram Joshi invited you for a meeting on ' + futureDate(5) + ' at 2:30 PM',
    data: { meetingId: 'meeting002' },
    read: false,
    createdAt: pastDate(1),
  },
  notif003: {
    userId: 'user002',
    type: 'referral',
    title: 'New Referral Received',
    body: 'Rajesh Patel gave you a referral for website development',
    data: { referralId: 'ref001' },
    read: true,
    createdAt: pastDate(30),
  },
  notif004: {
    userId: 'user001',
    type: 'referral',
    title: 'New Referral Received',
    body: 'Karan Modi gave you a referral for fabric supply',
    data: { referralId: 'ref005' },
    read: false,
    createdAt: pastDate(3),
  },
  notif005: {
    userId: 'user001',
    type: 'event',
    title: 'Upcoming Event Reminder',
    body: 'Monthly Business Networking Mixer is coming up in 7 days',
    data: { eventId: 'event001' },
    read: false,
    createdAt: pastDate(0),
  },
};

// ── Seed function ──
async function seed() {
  const data = {
    zones,
    chapters,
    users,
    events,
    meetings,
    referrals,
    ads,
    asks,
    notifications,
  };

  console.log('Seeding RTDB at', RTDB_URL, '...\n');

  for (const [collection, records] of Object.entries(data)) {
    for (const [key, value] of Object.entries(records)) {
      const url = `${RTDB_URL}/${collection}/${key}.json`;
      try {
        const resp = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(value),
        });
        if (!resp.ok) {
          const text = await resp.text();
          console.error(`  FAIL ${collection}/${key}: ${resp.status} ${text}`);
        } else {
          console.log(`  OK   ${collection}/${key}`);
        }
      } catch (err) {
        console.error(`  ERR  ${collection}/${key}:`, err.message);
      }
    }
  }

  console.log('\nDone! Check your Firebase Console.');
}

seed();
