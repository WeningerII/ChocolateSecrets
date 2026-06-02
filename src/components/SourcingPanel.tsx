import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Search, MapPin, Phone, Globe, Plus, Bookmark, BookmarkCheck, ExternalLink } from 'lucide-react';
import { queryFreshSources, keepNote, promoteNoteToSupplier } from '../services/sourcingService';
import { useKeptSourcingNotes } from '../hooks/useKeptSourcingNotes';
import { useRestaurantSettings } from '../hooks/useRestaurantSettings';
import { useToast } from '../contexts/ToastContext';
import { auth } from '../firebase';
import { SourcingCandidate, SourcingNote } from '../types';
import { Timestamp } from 'firebase/firestore';

interface SourcingPanelProps {
  ingredientId: string;
  ingredientName: string;
}

export default function SourcingPanel({ ingredientId, ingredientName }: SourcingPanelProps) {
  const { restaurant } = useRestaurantSettings();
  const { t } = useTranslation(['sourcing']);
  const { notes: keptNotes } = useKeptSourcingNotes(ingredientId);
  const { toast } = useToast();

  const [candidates, setCandidates] = useState<SourcingCandidate[]>([]);
  const [summary, setSummary] = useState<string | undefined>();
  const [searchSuggestionsHtml, setSearchSuggestionsHtml] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [askInput, setAskInput] = useState('');
  const [keepingKey, setKeepingKey] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);

  const hasZip = !!restaurant?.zipCode;

  const run = async (userQuery?: string) => {
    setLoading(true);
    setError(null);
    try {
      const r = await queryFreshSources({ ingredientName, userQuery });
      setCandidates(r.candidates);
      setSummary(r.summary);
      setSearchSuggestionsHtml(r.searchSuggestionsHtml);
      if (r.candidates.length === 0) {
        toast.error(t('sourcing:noResults'));
      }
    } catch (e: any) {
      setError(e.message || t('sourcing:queryFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleKeep = async (candidate: SourcingCandidate) => {
    const uid = auth.currentUser?.uid;
    if (!uid) { toast.error(t('sourcing:notAuthenticated')); return; }
    const key = candidateKey(candidate);
    setKeepingKey(key);
    try {
      await keepNote({ ingredientId, candidate, userId: uid });
      // Remove the kept candidate from the fresh list — it now lives in keptNotes via subscription
      setCandidates(prev => prev.filter(c => candidateKey(c) !== key));
      toast.success(t('sourcing:keptToast', { name: candidate.name }));
    } catch (e) {
      toast.error(t('sourcing:couldNotSave'));
      console.error(e);
    } finally {
      setKeepingKey(null);
    }
  };

  const handlePromote = async (note: SourcingNote) => {
    setPromotingId(note.id);
    try {
      const outcome = await promoteNoteToSupplier(note.id);
      toast.success(t(outcome.action === 'created' ? 'sourcing:addedToast' : 'sourcing:linkedToast', { name: note.name }));
    } catch (e) {
      toast.error(t('sourcing:couldNotPromote'));
      console.error(e);
    } finally {
      setPromotingId(null);
    }
  };

  const handleAsk = () => {
    const q = askInput.trim();
    if (!q) return;
    setAskInput('');
    run(q);
  };

  return (
    <div className="bg-white border border-cocoa-100 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-cocoa-100 flex items-baseline justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-cocoa-900">{t('sourcing:title')}</h3>
          {hasZip ? (
            <p className="text-xs text-cocoa-500 mt-0.5">{t('sourcing:nearZip', { zip: restaurant?.zipCode })}</p>
          ) : (
            <p className="text-xs text-cocoa-500 mt-0.5">
              <Link to="/admin/restaurant" className="text-copper hover:text-copper-dark underline">{t('sourcing:setZipPrompt')}</Link> {t('sourcing:setZipHelper')}
            </p>
          )}
        </div>
      </div>

      {/* Kept notes — institutional knowledge, permanent */}
      {keptNotes.length > 0 && (
        <div className="divide-y divide-cocoa-100">
          {keptNotes.map(note => (
            <KeptNoteCard
              key={note.id}
              note={note}
              promoting={promotingId === note.id}
              onPromote={() => handlePromote(note)}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Find-more trigger and fresh results */}
      <div className={keptNotes.length > 0 ? 'border-t border-cocoa-100 bg-cream/30' : ''}>
        {candidates.length === 0 && !loading && !error && (
          <div className="p-5 text-center">
            <button
              type="button"
              onClick={() => run()}
              className="inline-flex items-center gap-2 bg-copper hover:bg-copper-dark text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors"
            >
              <Search className="w-4 h-4" />
              {keptNotes.length > 0 ? t('sourcing:findMoreSources') : t('sourcing:findSources')}
            </button>
          </div>
        )}

        {loading && (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-cocoa-300 border-t-copper"></div>
            <p className="text-sm text-cocoa-500 mt-3">{t('sourcing:searching')}</p>
          </div>
        )}

        {error && (
          <div className="px-5 py-4 bg-raspberry/5 border-b border-raspberry/20">
            <p className="text-sm text-raspberry">{error}</p>
          </div>
        )}

        {candidates.length > 0 && !loading && (
          <div>
            {summary && (
              <div className="px-5 py-3 text-sm text-cocoa-700 leading-relaxed border-b border-cocoa-100">
                {summary}
              </div>
            )}
            <div className="divide-y divide-cocoa-100">
              {candidates.map(c => (
                <CandidateCard
                  key={candidateKey(c)}
                  candidate={c}
                  keeping={keepingKey === candidateKey(c)}
                  onKeep={() => handleKeep(c)}
                  t={t}
                />
              ))}
            </div>
            {searchSuggestionsHtml && (
              <div className="px-5 py-3 border-t border-cocoa-100">
                <div
                  className="sourcing-search-chips"
                  dangerouslySetInnerHTML={{ __html: searchSuggestionsHtml }}
                />
              </div>
            )}
            <div className="px-5 py-3 border-t border-cocoa-100 flex justify-center">
              <button
                type="button"
                onClick={() => run()}
                className="text-xs text-cocoa-500 hover:text-cocoa-900 underline decoration-dotted"
              >
                {t('sourcing:searchAgain')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Freeform ask — always visible at the bottom */}
      <div className="px-5 py-4 border-t border-cocoa-100 bg-cream">
        <label className="block text-xs font-medium text-cocoa-700 mb-1.5">{t('sourcing:askLabel')}</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={askInput}
            onChange={e => setAskInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk(); } }}
            placeholder={t('sourcing:askPlaceholder')}
            disabled={loading}
            className="flex-1 px-3 py-2 text-sm border border-cocoa-300 rounded-lg focus:ring-2 focus:ring-copper bg-white"
          />
          <button
            type="button"
            onClick={handleAsk}
            disabled={loading || !askInput.trim()}
            className="bg-cocoa-700 hover:bg-cocoa-900 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {t('sourcing:askButton')}
          </button>
        </div>
      </div>
    </div>
  );
}

function KeptNoteCard({ note, promoting, onPromote, t }: { note: SourcingNote; promoting: boolean; onPromote: () => void; t: any }) {
  const isPromoted = !!note.promotedToSupplierId;
  const keptDate = (() => {
    const d = (note.keptAt as Timestamp)?.toDate?.();
    if (!d) return null;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  })();

  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <BookmarkCheck className="w-4 h-4 text-copper shrink-0" />
            <span className="font-medium text-cocoa-900">{note.name}</span>
          </div>
          {note.address && (
            <div className="flex items-start gap-1.5 text-xs text-cocoa-500 mt-1 ml-6">
              <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
              <span>{note.address}</span>
            </div>
          )}
        </div>
        {keptDate && (
          <span className="text-xs text-cocoa-500 shrink-0">{t('sourcing:keptOn', { date: keptDate })}</span>
        )}
      </div>

      <div className="ml-6 mt-2 flex flex-wrap items-center gap-2 text-xs">
        {note.phone && (
          <a href={`tel:${note.phone}`} className="inline-flex items-center gap-1 px-2 py-1 bg-cocoa-100 hover:bg-cocoa-300 text-cocoa-700 rounded transition-colors">
            <Phone className="w-3 h-3" />{note.phone}
          </a>
        )}
        {note.website && (
          <a href={note.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 bg-cocoa-100 hover:bg-cocoa-300 text-cocoa-700 rounded transition-colors">
            <Globe className="w-3 h-3" />{t('sourcing:websiteButton')}
          </a>
        )}
      </div>

      {note.priceUsd !== undefined && (
        <div className="ml-6 mt-2 text-sm">
          <span className="font-mono text-cocoa-900">
            ${note.priceUsd.toFixed(2)}
            {note.priceUnit && <span className="text-cocoa-500 font-normal text-xs ml-1">/{t(`enums:units.${note.priceUnit}` as any, note.priceUnit)}</span>}
          </span>
          {note.observedAt && (
            <span className="text-xs text-cocoa-500 ml-2">{t('sourcing:asOf', { date: note.observedAt })}</span>
          )}
        </div>
      )}

      {note.notes && (
        <div className="ml-6 mt-2 text-xs text-cocoa-500 italic">{note.notes}</div>
      )}

      <div className="ml-6 mt-3 flex items-center justify-between gap-3">
        {note.sourceUrl && note.sourceDomain && (
          <a href={note.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-cocoa-500 hover:text-cocoa-700 underline decoration-dotted inline-flex items-center gap-1">
            {t('sourcing:sourceLabel', { domain: note.sourceDomain })}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
        <div className="ml-auto">
          {isPromoted ? (
            <span className="text-xs text-cocoa-500 italic">{t('sourcing:alreadySupplier')}</span>
          ) : (
            <button
              type="button"
              onClick={onPromote}
              disabled={promoting}
              className="inline-flex items-center gap-1 text-xs bg-copper/10 hover:bg-copper/20 text-copper-dark px-2 py-1.5 rounded font-medium disabled:opacity-50"
            >
              <Plus className="w-3 h-3" />
              {promoting ? t('sourcing:adding') : t('sourcing:makeSupplier')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CandidateCard({ candidate, keeping, onKeep, t }: { candidate: SourcingCandidate; keeping: boolean; onKeep: () => void; t: any }) {
  return (
    <div className="px-5 py-4 hover:bg-cream/50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-cocoa-900">{candidate.name}</div>
          {candidate.address && (
            <div className="flex items-start gap-1.5 text-xs text-cocoa-500 mt-1">
              <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
              <span>{candidate.address}</span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onKeep}
          disabled={keeping}
          className="inline-flex items-center gap-1 text-xs text-cocoa-700 hover:text-copper border border-cocoa-300 hover:border-copper px-2 py-1.5 rounded font-medium disabled:opacity-50 shrink-0"
          title={t('sourcing:keepTooltip')}
        >
          <Bookmark className="w-3 h-3" />
          {keeping ? t('sourcing:keeping') : t('sourcing:keep')}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        {candidate.phone && (
          <a href={`tel:${candidate.phone}`} className="inline-flex items-center gap-1 px-2 py-1 bg-cocoa-100 hover:bg-cocoa-300 text-cocoa-700 rounded transition-colors">
            <Phone className="w-3 h-3" />{candidate.phone}
          </a>
        )}
        {candidate.website && (
          <a href={candidate.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 bg-cocoa-100 hover:bg-cocoa-300 text-cocoa-700 rounded transition-colors">
            <Globe className="w-3 h-3" />{t('sourcing:websiteButton')}
          </a>
        )}
      </div>

      {candidate.priceUsd !== undefined && (
        <div className="mt-2 text-sm">
          <span className="font-mono text-cocoa-900">
            ${candidate.priceUsd.toFixed(2)}
            {candidate.priceUnit && <span className="text-cocoa-500 font-normal text-xs ml-1">/{t(`enums:units.${candidate.priceUnit}` as any, candidate.priceUnit)}</span>}
          </span>
          {candidate.observedAt && (
            <span className="text-xs text-cocoa-500 ml-2">{t('sourcing:asOf', { date: candidate.observedAt })}</span>
          )}
        </div>
      )}

      {candidate.notes && (
        <div className="mt-2 text-xs text-cocoa-500 italic">{candidate.notes}</div>
      )}

      {candidate.sourceUrl && candidate.sourceDomain && (
        <div className="mt-2">
          <a
            href={candidate.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cocoa-500 hover:text-cocoa-700 underline decoration-dotted inline-flex items-center gap-1"
          >
            {t('sourcing:sourceLabel', { domain: candidate.sourceDomain })}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
}

function candidateKey(c: SourcingCandidate): string {
  return `${c.name}|${c.website || c.address || c.phone || ''}`;
}
