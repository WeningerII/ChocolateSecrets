import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import RecipeEditor from '../components/RecipeEditor';
import { Recipe } from '../types';
import { addDoc, updateDoc, doc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

import { attachRecipeLocalizedFields, stripUndefined } from '../utils/localized';
import { SupportedLanguage } from '../types';

export default function RecipeEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['recipes']);
  const { recipes, ingredients, loading } = useData();
  const { toast } = useToast();
  
  const isNew = id === 'new';
  const recipe = !isNew ? recipes.find(r => r.id === id) : null;
  
  const handleSave = async (data: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const uiLanguage = (i18n.language.split('-')[0] as SupportedLanguage);
      const recipeWithLocalized = attachRecipeLocalizedFields(
        data as Recipe,
        recipe || undefined,
        uiLanguage
      );
      const sanitized = stripUndefined(recipeWithLocalized);

      if (isNew) {
        const newDoc = await addDoc(collection(db, 'recipes'), {
          ...sanitized,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast.success(t('recipes:saved'));
        navigate(`/recipes/${newDoc.id}`);
      } else if (recipe) {
        await updateDoc(doc(db, 'recipes', recipe.id!), {
          ...sanitized,
          updatedAt: serverTimestamp(),
        });
        toast.success(t('recipes:saved'));
        navigate(`/recipes/${recipe.id}`);
      }
    } catch (e) {
      toast.error(t('recipes:saveFailed'));
      console.error(e);
    }
  };
  
  const handleCancel = () => {
    if (isNew) {
      navigate('/recipes');
    } else if (recipe) {
      navigate(`/recipes/${recipe.id}`);
    } else {
      navigate('/recipes');
    }
  };
  
  if (loading) {
    return <div className="p-8 text-center text-cocoa-500">{t('common:loading')}</div>;
  }
  
  if (!isNew && !recipe) {
    return <div className="p-8 text-center text-cocoa-500">{t('recipes:notFound')}</div>;
  }
  
  return (
    <RecipeEditor
      initialRecipe={recipe || null}
      ingredients={ingredients}
      recipes={recipes}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}
