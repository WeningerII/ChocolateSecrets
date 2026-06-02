/**
 * Usage:
 * node scripts/reconcile-inventory.mjs <path-to-service-account.json>
 *
 * This script connects to the production Firestore and compares the aggregated `quantity` 
 * of all active lots for an ingredient against the ingredient's documented `stock`.
 * Expected behavior: `Sum(lots.quantity) == ingredient.stock`.
 * Reports any mismatch or orphaned stock.
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccountPath = process.argv[2];
if (!serviceAccountPath) {
  console.error('Usage: node scripts/reconcile-inventory.mjs <path-to-service-account.json>');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function run() {
  console.log('Fetching inventory data for reconciliation...');
  
  const [ingredientsSnapshot, lotsSnapshot] = await Promise.all([
    db.collection('ingredients').get(),
    db.collection('lots').get()
  ]);

  const ingredients = {};
  ingredientsSnapshot.forEach(doc => {
    const data = doc.data();
    ingredients[doc.id] = {
      name: data.name,
      stock: data.stock || 0,
      id: doc.id
    };
  });

  const lotsByIngredient = {};
  lotsSnapshot.forEach(doc => {
    const data = doc.data();
    if (!lotsByIngredient[data.ingredientId]) {
      lotsByIngredient[data.ingredientId] = [];
    }
    lotsByIngredient[data.ingredientId].push(data.quantity || 0);
  });

  let mismatches = 0;
  let matches = 0;

  console.log('\n--- Reconciliation Report ---\n');

  for (const [id, ingredient] of Object.entries(ingredients)) {
    const lots = lotsByIngredient[id] || [];
    const sumOfLots = lots.reduce((acc, qty) => acc + qty, 0);
    const listedStock = ingredient.stock;

    // precision rounding logic to avoid float point issues
    const diff = Math.abs(sumOfLots - listedStock);
    
    if (diff > 0.001) {
      mismatches++;
      if (lots.length === 0 && listedStock > 0) {
        console.log(`[MISMATCH] ${ingredient.name} [${id}]: stock=${listedStock}, sum-of-lots=${sumOfLots}, diff=${(listedStock - sumOfLots).toFixed(2)} (ORPHANED STOCK)`);
      } else {
        console.log(`[MISMATCH] ${ingredient.name} [${id}]: stock=${listedStock}, sum-of-lots=${sumOfLots}, diff=${(listedStock - sumOfLots).toFixed(2)}`);
      }
    } else {
      matches++;
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Matched ingredients: ${matches}`);
  console.log(`Mismatched ingredients: ${mismatches}`);

  process.exit(0);
}

run().catch(console.error);
