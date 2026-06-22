import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useToast } from '../contexts/ToastContext';
import { AllergenKey, ALLERGEN_LABELS } from '../services/culinaryTools';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { migrateRecipesToV2 } from '../utils/recipeMigration';
import { migrateRecipeRoles } from '../utils/recipeRoleMigration';
import { recomputeAllCrossContactRisks } from '../utils/crossContactRecompute';
import { RESTAURANT_ID } from '../constants/tenant';

const ALL_ALLERGEN_KEYS: AllergenKey[] = [
  'milk', 'eggs', 'fish', 'shellfish', 'tree_nuts', 'peanuts', 'wheat', 'soy', 'sesame',
  'celery', 'mustard', 'sulphites', 'lupin', 'molluscs',
];

export default function RestaurantSettings() {
  const { t } = useTranslation(['common', 'ingredientInfo', 'enums']);
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [disclaimer, setDisclaimer] = useState<Set<AllergenKey>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ migrated: number; skipped: number; liftedLegacyIngredients: number } | null>(null);

  const [isRoleMigrating, setIsRoleMigrating] = useState(false);
  const [roleMigrationResult, setRoleMigrationResult] = useState<{ recipesUpdated: number; ingredientsTagged: number; ambiguousOrLowConfidence: number } | null>(null);

  const [isRecomputing, setIsRecomputing] = useState(false);
  const [recomputeResult, setRecomputeResult] = useState<{ scanned: number; updated: number; unchanged: number } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'restaurants', RESTAURANT_ID));
        if (snap.exists()) {
          const data = snap.data();
          setName(data.name || '');
          setZipCode(data.zipCode || '');
          setDisclaimer(new Set(data.standingAllergenDisclaimer || []));
        }
      } catch (e) {
        console.error('Failed to load restaurant settings', e);
      }
      setLoading(false);
    };
    load();
  }, []);

  const toggleAllergen = (key: AllergenKey) => {
    setDisclaimer(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleRunMigration = async () => {
    setIsMigrating(true);
    setMigrationResult(null);
    try {
      const result = await migrateRecipesToV2();
      setMigrationResult(result);
      toast.success(t('common:dataMigration.completeToast', { migrated: result.migrated, skipped: result.skipped }));
    } catch (e) {
      toast.error(t('common:dataMigration.failedToast'));
      console.error('[migrateRecipesToV2] Failed:', e);
    }
    setIsMigrating(false);
  };

  const handleRunRoleMigration = async () => {
    setIsRoleMigrating(true);
    setRoleMigrationResult(null);
    try {
      const result = await migrateRecipeRoles();
      setRoleMigrationResult(result);
      toast.success(t('common:admin.roleMigration.success', {
        recipesUpdated: result.recipesUpdated,
        ingredientsTagged: result.ingredientsTagged,
        ambiguous: result.ambiguousOrLowConfidence
      }));
    } catch (e) {
      toast.error(t('common:dataMigration.failedToast'));
      console.error('[migrateRecipeRoles] Failed:', e);
    }
    setIsRoleMigrating(false);
  };

  const handleRecomputeCrossContact = async () => {
    setIsRecomputing(true);
    setRecomputeResult(null);
    try {
      const result = await recomputeAllCrossContactRisks();
      setRecomputeResult(result);
      toast.success(t('common:admin.crossContactRecompute.completeToast', { updated: result.updated }));
    } catch (e) {
      toast.error(t('common:admin.crossContactRecompute.failedToast'));
      console.error('[recomputeAllCrossContactRisks] Failed:', e);
    }
    setIsRecomputing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'restaurants', RESTAURANT_ID), {
        id: RESTAURANT_ID,
        name: name.trim(),
        zipCode: zipCode.trim(),
        standingAllergenDisclaimer: Array.from(disclaimer),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      toast.success(t('common:settingsSaved'));
    } catch (e) {
      toast.error(t('common:settingsSaveFailed'));
      console.error(e);
    }
    setSaving(false);
  };

  if (loading) return <div className="p-8 text-center text-cocoa-500">{t('common:loading_ellipsis')}</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Link to="/" className="inline-flex items-center gap-2 text-cocoa-500 hover:text-cocoa-900 text-sm mb-4">
        <ArrowLeft className="w-4 h-4" /> {t('common:back')}
      </Link>

      <h1 className="font-display text-4xl font-semibold text-cocoa-900 mb-2">{t('common:restaurantSettingsTitle')}</h1>
      <p className="text-cocoa-500 mb-8">{t('common:restaurantSettingsSubtitle')}</p>

      <div className="bg-white rounded-2xl border border-cocoa-100 p-6 mb-6">
        <h2 className="font-display text-xl font-semibold text-cocoa-900 mb-4">{t('common:basicsSection')}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('common:restaurantNameLabel')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-cocoa-300 rounded-lg focus:ring-2 focus:ring-copper"
              placeholder={t('common:restaurantNamePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('common:zipCodeLabel')}</label>
            <input
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value.trim())}
              className="w-full px-3 py-2 border border-cocoa-300 rounded-lg focus:ring-2 focus:ring-copper max-w-[200px]"
              placeholder={t('common:zipCodePlaceholder')}
              maxLength={10}
            />
            <p className="text-xs text-cocoa-500 mt-1">{t('common:zipCodeHelper')}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-cocoa-100 p-6 mb-6">
        <h2 className="font-display text-xl font-semibold text-cocoa-900 mb-2">{t('common:standingDisclaimerTitle')}</h2>
        <p className="text-cocoa-500 text-sm mb-4">
          {t('common:standingDisclaimerBody')}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ALL_ALLERGEN_KEYS.map(key => (
            <label key={key} className="flex items-center gap-2 px-3 py-2 border border-cocoa-100 rounded-lg hover:bg-cream cursor-pointer">
              <input
                type="checkbox"
                checked={disclaimer.has(key)}
                onChange={() => toggleAllergen(key)}
                className="rounded text-copper focus:ring-copper"
              />
              <span className="text-sm text-cocoa-900">{t(`enums:allergens.${key}` as any, ALLERGEN_LABELS[key])}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-cocoa-100 p-6 mb-6">
        <h2 className="font-display text-xl font-semibold text-cocoa-900 mb-2">{t('common:dataMigration.title')}</h2>
        <p className="text-cocoa-500 text-sm mb-4">
          {t('common:dataMigration.description')}
        </p>
        <div className="flex gap-4">
          <button
            onClick={handleRunMigration}
            disabled={isMigrating || isRoleMigrating}
            className="bg-copper hover:bg-copper-dark text-white px-6 py-2 rounded-xl font-medium disabled:opacity-60"
          >
            {isMigrating ? t('common:dataMigration.running') : t('common:dataMigration.run')}
          </button>
          <button
            onClick={handleRunRoleMigration}
            disabled={isMigrating || isRoleMigrating}
            className="bg-copper hover:bg-copper-dark text-white px-6 py-2 rounded-xl font-medium disabled:opacity-60"
          >
            {isRoleMigrating ? t('common:admin.roleMigration.running') : t('common:admin.roleMigration.button')}
          </button>
        </div>
        {migrationResult && (
          <p className="mt-4 text-sm text-cocoa-700">
            {t('common:dataMigration.result', { migrated: migrationResult.migrated, lifted: migrationResult.liftedLegacyIngredients, skipped: migrationResult.skipped })}
          </p>
        )}
        {roleMigrationResult && (
          <p className="mt-4 text-sm text-cocoa-700">
            {t('common:admin.roleMigration.success', {
              recipesUpdated: roleMigrationResult.recipesUpdated,
              ingredientsTagged: roleMigrationResult.ingredientsTagged,
              ambiguous: roleMigrationResult.ambiguousOrLowConfidence
            })}
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-cocoa-100 p-6 mb-6">
        <h2 className="font-display text-xl font-semibold text-cocoa-900 mb-2">{t('common:admin.crossContactRecompute.title')}</h2>
        <p className="text-cocoa-500 text-sm mb-4">
          {t('common:admin.crossContactRecompute.description')}
        </p>
        <button
          onClick={handleRecomputeCrossContact}
          disabled={isRecomputing}
          className="bg-copper hover:bg-copper-dark text-white px-6 py-2 rounded-xl font-medium disabled:opacity-60"
        >
          {isRecomputing ? t('common:admin.crossContactRecompute.running') : t('common:admin.crossContactRecompute.button')}
        </button>
        {recomputeResult && (
          <p className="mt-4 text-sm text-cocoa-700">
            {t('common:admin.crossContactRecompute.result', { scanned: recomputeResult.scanned, updated: recomputeResult.updated, unchanged: recomputeResult.unchanged })}
          </p>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-copper hover:bg-copper-dark text-white px-6 py-2 rounded-xl font-medium disabled:opacity-60"
      >
        {saving ? t('common:saving') : t('common:saveSettings')}
      </button>
    </div>
  );
}
