import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const CATEGORIES = [
  // Operating — Occupancy
  { glAccountCode: '7100', name: 'Rent',                          parent: 'operating' },
  { glAccountCode: '7110', name: 'Common Area Maintenance',       parent: 'operating' },
  { glAccountCode: '7120', name: 'Property Tax',                  parent: 'operating' },
  
  // Operating — Utilities
  { glAccountCode: '7210', name: 'Utilities — Electric',          parent: 'operating' },
  { glAccountCode: '7220', name: 'Utilities — Gas',               parent: 'operating' },
  { glAccountCode: '7230', name: 'Utilities — Water & Sewer',     parent: 'operating' },
  { glAccountCode: '7240', name: 'Utilities — Internet & Telecom',parent: 'operating' },
  
  // Operating — Maintenance
  { glAccountCode: '7300', name: 'Repairs & Maintenance',         parent: 'operating' },
  { glAccountCode: '7310', name: 'Equipment Maintenance',         parent: 'operating' },
  { glAccountCode: '7320', name: 'Cleaning & Sanitation',         parent: 'operating' },
  
  // Operating — Insurance
  { glAccountCode: '7410', name: 'Insurance — Property',          parent: 'operating' },
  { glAccountCode: '7420', name: 'Insurance — General Liability', parent: 'operating' },
  { glAccountCode: '7430', name: 'Insurance — Workers Comp',      parent: 'operating' },
  
  // Operating — Software & Fees
  { glAccountCode: '7500', name: 'Software & Subscriptions',      parent: 'operating' },
  { glAccountCode: '7510', name: 'Payment Processing Fees',       parent: 'operating' },
  { glAccountCode: '7520', name: 'Bank Fees',                     parent: 'operating' },
  
  // Operating — Professional
  { glAccountCode: '7610', name: 'Professional Fees — Accounting',parent: 'operating' },
  { glAccountCode: '7620', name: 'Professional Fees — Legal',     parent: 'operating' },
  
  // Operating — Other
  { glAccountCode: '7700', name: 'Marketing & Advertising',       parent: 'operating' },
  { glAccountCode: '7800', name: 'Licenses & Permits',            parent: 'operating' },
  { glAccountCode: '7810', name: 'Waste Removal',                 parent: 'operating' },
  { glAccountCode: '7820', name: 'Pest Control',                  parent: 'operating' },
  { glAccountCode: '7900', name: 'Supplies — Non-Food',           parent: 'operating' },
  { glAccountCode: '7910', name: 'Linens & Laundry',              parent: 'operating' },
  { glAccountCode: '7920', name: 'Smallwares',                    parent: 'operating' },
  
  // Non-operating
  { glAccountCode: '9100', name: 'Interest Expense',              parent: 'non_operating' },
  { glAccountCode: '9200', name: 'Depreciation',                  parent: 'non_operating' },
  { glAccountCode: '9900', name: 'Other Non-Operating',           parent: 'non_operating' },
];

async function run() {
  const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');
  let projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId && fs.existsSync(blueprintPath)) {
    const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
    projectId = blueprint.projectId;
  }
  if (!projectId) {
    console.error('FIREBASE_PROJECT_ID not set or firebase-blueprint.json not found');
    process.exit(1);
  }

  initializeApp({ projectId });
  const db = getFirestore();
  const colRef = db.collection('expenseCategories');

  let created = 0;
  let skipped = 0;

  for (const cat of CATEGORIES) {
    const query = await colRef.where('glAccountCode', '==', cat.glAccountCode).get();
    if (!query.empty) {
      console.log(`Skipping [${cat.glAccountCode}] ${cat.name} — already exists as ${query.docs[0].id}`);
      skipped++;
      continue;
    }

    const docRef = colRef.doc();
    const now = Timestamp.now();
    await docRef.set({
      id: docRef.id,
      name: cat.name,
      parent: cat.parent,
      glAccountCode: cat.glAccountCode,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Created [${cat.glAccountCode}] ${cat.name}`);
    created++;
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
