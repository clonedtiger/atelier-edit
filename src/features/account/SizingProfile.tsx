'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Modal } from '@/components/ui/Modal';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  sex: string | null;
  phone: string | null;
  height: string | null;
  weight: string | null;
  waistSize: string | null;
  braSize: string | null;
  shoeSize: string | null;
  hatSize: string | null;
  gloveSize: string | null;
  clothingSize: string | null;
  workLife: string | null;
  inspirationNotes: string | null;
  mfaEnabled: boolean;
  marketingEmail?: boolean;
  marketingSms?: boolean;
  marketingPartners?: boolean;
}

export interface InspirationImage {
  id: string;
  imageUrl: string;
  notes: string | null;
  tags: string[];
  createdAt: string;
}

interface SizingProfileProps {
  user: UserProfile;
  inspirations: InspirationImage[];
  onSaveProfile: (profileData: Partial<UserProfile>) => Promise<void>;
  onUploadInspiration: (file: File) => Promise<void>;
  onDeleteInspiration: (id: string) => Promise<void>;
  onExportData: () => Promise<void>;
  onDeleteAccount: (confirmText: string) => Promise<void>;
}

export function SizingProfile({
  user,
  inspirations,
  onSaveProfile,
  onUploadInspiration,
  onDeleteInspiration,
  onExportData,
  onDeleteAccount,
}: SizingProfileProps) {
  // Profile Form States
  const [name, setName] = useState(user.name || '');
  const [sex, setSex] = useState(user.sex || 'Female');
  const [phone, setPhone] = useState(user.phone || '');
  const [height, setHeight] = useState(user.height || '');
  const [weight, setWeight] = useState(user.weight || '');
  const [waistSize, setWaistSize] = useState(user.waistSize || '');
  const [braSize, setBraSize] = useState(user.braSize || '');
  const [shoeSize, setShoeSize] = useState(user.shoeSize || '');
  const [clothingSize, setClothingSize] = useState(user.clothingSize || '');
  const [hatSize, setHatSize] = useState(user.hatSize || '');
  const [gloveSize, setGloveSize] = useState(user.gloveSize || '');
  const [workLife, setWorkLife] = useState(user.workLife || '');
  const [inspirationNotes, setInspirationNotes] = useState(user.inspirationNotes || '');
  const [isSaving, setIsSaving] = useState(false);

  // Marketing & GDPR Consent States
  const [marketingEmail, setMarketingEmail] = useState(user.marketingEmail ?? false);
  const [marketingSms, setMarketingSms] = useState(user.marketingSms ?? false);
  const [marketingPartners, setMarketingPartners] = useState(user.marketingPartners ?? false);

  // Deletion Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingInspiration, setIsUploadingInspiration] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveProfile({
        name,
        sex,
        phone,
        height,
        weight,
        waistSize,
        braSize,
        shoeSize,
        clothingSize,
        hatSize,
        gloveSize,
        workLife,
        inspirationNotes,
        marketingEmail,
        marketingSms,
        marketingPartners,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInspirationFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingInspiration(true);
    try {
      await onUploadInspiration(files[0]);
    } finally {
      setIsUploadingInspiration(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') return;
    setIsDeleting(true);
    try {
      await onDeleteAccount(deleteConfirmText);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* Sizing & Measurement Profile */}
      <form onSubmit={handleSave} className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-6 sm:p-8 shadow-sm space-y-6">
        <div className="border-b border-[var(--border-color)] pb-4">
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[var(--accent)]">
            Haute Couture Profile
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif text-[var(--text-primary)] font-light mt-1">
            Physical Measurements & Fit Specs
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Your body specifications are utilized by the AI Stylist to recommend flattering garment cuts, proportions, and sizes.
          </p>
        </div>

        {/* Identity & Basic Specs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)]/30 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-1">
              Biological Sex / Presentation
            </label>
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)]/30 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
            >
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other / Non-Binary</option>
            </select>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)]/30 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
            />
          </div>
        </div>

        {/* Measurements Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-1">
              Height
            </label>
            <input
              type="text"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="e.g. 5'8 or 173 cm"
              className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)]/30 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-1">
              Weight
            </label>
            <input
              type="text"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 130 lbs / 59 kg"
              className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)]/30 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-1">
              Waist Measurement
            </label>
            <input
              type="text"
              value={waistSize}
              onChange={(e) => setWaistSize(e.target.value)}
              placeholder="e.g. 26 in / 66 cm"
              className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)]/30 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-1">
              Clothing Size
            </label>
            <input
              type="text"
              value={clothingSize}
              onChange={(e) => setClothingSize(e.target.value)}
              placeholder="e.g. US 4 / UK 8 / EU 36"
              className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)]/30 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-1">
              Shoe Size
            </label>
            <input
              type="text"
              value={shoeSize}
              onChange={(e) => setShoeSize(e.target.value)}
              placeholder="e.g. US 8 / EU 38.5"
              className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)]/30 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
            />
          </div>

          {sex !== 'Male' && (
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-1">
                Bra Size
              </label>
              <input
                type="text"
                value={braSize}
                onChange={(e) => setBraSize(e.target.value)}
                placeholder="e.g. 34B"
                className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)]/30 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-1">
              Hat Size
            </label>
            <input
              type="text"
              value={hatSize}
              onChange={(e) => setHatSize(e.target.value)}
              placeholder="e.g. 56 cm / Medium"
              className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)]/30 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-1">
              Glove Size
            </label>
            <input
              type="text"
              value={gloveSize}
              onChange={(e) => setGloveSize(e.target.value)}
              placeholder="e.g. 7 / Small"
              className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)]/30 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
            />
          </div>
        </div>

        {/* Narrative & Lifestyle Context */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-1">
              Work & Daily Life Silhouette
            </label>
            <textarea
              rows={3}
              value={workLife}
              onChange={(e) => setWorkLife(e.target.value)}
              placeholder="e.g. Creative director, tech executive, frequent traveler, prefers tailored minimalism..."
              className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)]/30 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-1">
              Style Inspirations & Muse Keywords
            </label>
            <textarea
              rows={3}
              value={inspirationNotes}
              onChange={(e) => setInspirationNotes(e.target.value)}
              placeholder="e.g. Classic Chanel bouclé tweed meets McQueen punk tailoring and Toteme coats..."
              className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)]/30 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
            />
          </div>
        </div>

        {/* Marketing & GDPR Consent */}
        <div className="p-4 bg-[var(--bg-secondary)]/40 rounded-xl border border-[var(--border-color)] space-y-3">
          <h4 className="text-xs uppercase tracking-widest font-bold text-[var(--text-primary)]">
            Privacy & Communication Preferences (GDPR Compliance)
          </h4>
          <div className="flex flex-col sm:flex-row gap-4 text-xs text-[var(--text-secondary)]">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={marketingEmail}
                onChange={(e) => setMarketingEmail(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <span>Editorial Drop Newsletters</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={marketingSms}
                onChange={(e) => setMarketingSms(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <span>SMS Stylist Alerts</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={marketingPartners}
                onChange={(e) => setMarketingPartners(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <span>Partner Luxury Boutiques</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 text-xs uppercase tracking-widest font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] rounded-lg shadow-md transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving Profile...' : 'Save Haute Couture Profile'}
          </button>
        </div>
      </form>

      {/* Visual Moodboard Inspirations */}
      <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[var(--accent)]">
              Visual Aesthetics
            </span>
            <h3 className="text-2xl sm:text-3xl font-serif text-[var(--text-primary)] font-light mt-1">
              Style Moodboard & Visual Inspirations
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Upload runway screenshots, editorial lookbook photos, or street-style images. Gemini analyzes color palettes and textures.
            </p>
          </div>

          <label className="px-4 py-2 text-xs uppercase tracking-widest font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] rounded-lg shadow-sm cursor-pointer transition-colors text-center">
            {isUploadingInspiration ? 'Analyzing...' : '+ Add Moodboard Photo'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleInspirationFile}
              disabled={isUploadingInspiration}
            />
          </label>
        </div>

        {inspirations.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] italic py-4">No visual moodboard photos uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {inspirations.map((ins) => (
              <div
                key={ins.id}
                className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-[var(--bg-secondary)] border border-[var(--border-color)]"
              >
                <Image src={ins.imageUrl} alt="Inspiration" fill sizes="200px" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end text-white">
                  {ins.notes && <p className="text-[11px] font-serif italic mb-2 line-clamp-2">{ins.notes}</p>}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {ins.tags?.slice(0, 3).map((tag, i) => (
                      <span key={i} className="text-[9px] uppercase px-1.5 py-0.5 bg-white/20 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => onDeleteInspiration(ins.id)}
                    className="text-[10px] text-rose-300 hover:text-rose-100 uppercase tracking-widest font-bold text-right"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* GDPR Data Sovereignty & Account Erasure */}
      <div className="bg-[var(--bg-primary)] rounded-2xl border border-rose-900/20 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="border-b border-[var(--border-color)] pb-4">
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-rose-700">
            Data Sovereignty & Privacy
          </span>
          <h3 className="text-2xl font-serif text-[var(--text-primary)] font-light mt-1">
            GDPR Article 17 Data Rights & Account Erasure
          </h3>
        </div>

        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          You maintain full ownership of your wardrobe images, measurements, and stylistic journal. You can download an offline archive of all your records, or permanently erase your account and all associated cloud storage assets.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <button
            onClick={onExportData}
            className="px-4 py-2 text-xs uppercase tracking-widest font-bold border border-[var(--border-color-hover)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
          >
            Export Personal Data Archive (JSON)
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 text-xs uppercase tracking-widest font-bold bg-rose-700 hover:bg-rose-800 text-white rounded-lg transition-colors"
          >
            Permanently Erase Account & Data
          </button>
        </div>
      </div>

      {/* GDPR Deletion Confirmation Dialog */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Permanent Account Erasure"
        subtitle="GDPR Article 17 Right to Erasure"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            This action is irreversible. All your uploaded garment images, sizing measurements, styling lookbooks, and session history will be permanently deleted from the database and Cloud Storage.
          </p>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] mb-1">
              Type <span className="text-rose-600">DELETE</span> to confirm permanent erasure:
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)]/30 border border-rose-300 rounded-lg font-mono text-[var(--text-primary)] uppercase"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 text-xs uppercase tracking-widest font-semibold text-[var(--text-secondary)]"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE' || isDeleting}
              className="px-5 py-2 text-xs uppercase tracking-widest font-bold bg-rose-700 hover:bg-rose-800 text-white rounded-lg transition-colors disabled:opacity-40"
            >
              {isDeleting ? 'Erasing Everything...' : 'Confirm Erasure'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
