'use client';

import { useState } from 'react';

export const DRESS_OPTIONS = [
  { value: 'Female', label: 'Womenswear' },
  { value: 'Male', label: 'Menswear' },
  { value: 'Other', label: 'Both / gender-neutral' },
];

interface OnboardingChecklistProps {
  gender: string | null | undefined;
  styleAesthetic: string | null | undefined;
  styleOptions: Array<{ id: string; label: string }>;
  wardrobeCount: number;
  hasLooks: boolean;
  isGenerating: boolean;
  onSaveBasics: (gender: string, styleAesthetic: string) => Promise<boolean>;
  onAddPieces: () => void;
  onStyleMe: () => void;
  onDismiss: () => void;
}

const MIN_PIECES = 3;

/**
 * First-run setup shown on Today until the three basics are done:
 * how you dress and your style → a few pieces → your first looks.
 */
export function OnboardingChecklist({
  gender,
  styleAesthetic,
  styleOptions,
  wardrobeCount,
  hasLooks,
  isGenerating,
  onSaveBasics,
  onAddPieces,
  onStyleMe,
  onDismiss,
}: OnboardingChecklistProps) {
  const basicsDone = Boolean(gender && styleAesthetic);
  const piecesDone = wardrobeCount >= MIN_PIECES;

  const [draftGender, setDraftGender] = useState(gender || '');
  const [draftStyle, setDraftStyle] = useState(styleAesthetic || '');
  const [saving, setSaving] = useState(false);

  const steps = [basicsDone, piecesDone, hasLooks];
  const doneCount = steps.filter(Boolean).length;

  const saveBasics = async () => {
    if (!draftGender || !draftStyle) return;
    setSaving(true);
    await onSaveBasics(draftGender, draftStyle);
    setSaving(false);
  };

  return (
    <section className="onboarding-card" aria-labelledby="onboarding-title">
      <div className="onboarding-header">
        <div>
          <p className="onboarding-eyebrow">Getting started · {doneCount} of 3</p>
          <h2 id="onboarding-title">Set up your stylist</h2>
        </div>
        <button type="button" className="guide-helper-btn" onClick={onDismiss}>
          Skip for now
        </button>
      </div>

      <ol className="onboarding-steps">
        <li className={basicsDone ? 'done' : 'current'}>
          <span className="onboarding-step-marker" aria-hidden="true">{basicsDone ? '✓' : '1'}</span>
          <div className="onboarding-step-body">
            <h3>Tell us how you dress</h3>
            {basicsDone ? (
              <p>{DRESS_OPTIONS.find((o) => o.value === gender)?.label || gender} · {styleAesthetic}</p>
            ) : (
              <>
                <p>So suggestions fit you from the first look.</p>
                <p className="onboarding-group-label" id="onboarding-dress-label">I dress in</p>
                <div className="onboarding-choices" role="radiogroup" aria-labelledby="onboarding-dress-label">
                  {DRESS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={draftGender === option.value}
                      className={`onboarding-chip ${draftGender === option.value ? 'selected' : ''}`}
                      onClick={() => setDraftGender(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="onboarding-group-label" id="onboarding-style-label">My style is closest to</p>
                <div className="onboarding-choices" role="radiogroup" aria-labelledby="onboarding-style-label">
                  {styleOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={draftStyle === option.label}
                      className={`onboarding-chip ${draftStyle === option.label ? 'selected' : ''}`}
                      onClick={() => setDraftStyle(option.label)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="accent-button onboarding-action"
                  disabled={!draftGender || !draftStyle || saving}
                  onClick={saveBasics}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </>
            )}
          </div>
        </li>

        <li className={piecesDone ? 'done' : basicsDone ? 'current' : ''}>
          <span className="onboarding-step-marker" aria-hidden="true">{piecesDone ? '✓' : '2'}</span>
          <div className="onboarding-step-body">
            <h3>Add a few pieces</h3>
            <p>
              {piecesDone
                ? `${wardrobeCount} pieces in your wardrobe.`
                : `Photograph at least ${MIN_PIECES} pieces you wear often. One photo can hold several items laid flat.`}
            </p>
            {!piecesDone && (
              <button type="button" className="accent-button onboarding-action" onClick={onAddPieces}>
                Add pieces{wardrobeCount > 0 ? ` (${wardrobeCount} of ${MIN_PIECES})` : ''}
              </button>
            )}
          </div>
        </li>

        <li className={hasLooks ? 'done' : basicsDone && piecesDone ? 'current' : ''}>
          <span className="onboarding-step-marker" aria-hidden="true">{hasLooks ? '✓' : '3'}</span>
          <div className="onboarding-step-body">
            <h3>Get your first looks</h3>
            <p>Three outfits from your own wardrobe, styled for today&apos;s weather.</p>
            {!hasLooks && (
              <button
                type="button"
                className="accent-button onboarding-action"
                disabled={!piecesDone || isGenerating}
                onClick={onStyleMe}
              >
                {isGenerating ? 'Styling…' : 'Style me'}
              </button>
            )}
          </div>
        </li>
      </ol>
    </section>
  );
}
