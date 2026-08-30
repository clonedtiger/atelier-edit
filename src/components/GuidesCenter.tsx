'use client';

import React, { useState, useMemo } from 'react';
import { GUIDE_CATEGORIES, GUIDES_ARTICLES, GuideCategory, GuideArticle } from '../data/guides_data';

interface GuidesCenterProps {
  initialCategory?: string;
  onNavigateTab?: (tab: string) => void;
}

export const GuidesCenter: React.FC<GuidesCenterProps> = ({
  initialCategory = 'all',
  onNavigateTab,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedFaqs, setExpandedFaqs] = useState<Record<string, boolean>>({});

  const filteredArticles = useMemo(() => {
    return GUIDES_ARTICLES.filter((article) => {
      const matchesCategory =
        selectedCategory === 'all' || article.category === selectedCategory;

      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const matchTitle = article.title.toLowerCase().includes(q);
      const matchSummary = article.summary.toLowerCase().includes(q);
      const matchSections = article.sections.some(
        (s) =>
          s.heading.toLowerCase().includes(q) ||
          s.content.some((c) => c.toLowerCase().includes(q)) ||
          (s.steps && s.steps.some((st) => st.toLowerCase().includes(q)))
      );
      const matchFaqs =
        article.faqs &&
        article.faqs.some(
          (f) =>
            f.question.toLowerCase().includes(q) ||
            f.answer.toLowerCase().includes(q)
        );

      return matchTitle || matchSummary || matchSections || matchFaqs;
    });
  }, [selectedCategory, searchQuery]);

  const toggleFaq = (key: string) => {
    setExpandedFaqs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="guides-wrapper" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Editorial Guides Hero Header */}
      <div className="lookbook-panel guides-hero-panel" style={{ padding: '2.5rem 2rem', marginBottom: '2rem', textAlign: 'center' }}>
        <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--accent)', fontWeight: 600 }}>
          Atelier Edit Knowledge &amp; Styling Handbook
        </span>
        <h2 style={{ fontSize: '2.25rem', fontFamily: 'var(--font-serif)', margin: '0.5rem 0 1rem', color: 'var(--foreground)' }}>
          Guides &amp; Feature Documentation
        </h2>
        <p style={{ maxWidth: '680px', margin: '0 auto 1.5rem', color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
          Explore step-by-step guides, best practices, and answers to common questions about tailoring consultations, flat-lay studio creation, capsule matrices, sizing systems, and GDPR privacy controls.
        </p>

        {/* Real-time Search Input */}
        <div style={{ maxWidth: '560px', margin: '0 auto', position: 'relative' }}>
          <input
            type="text"
            className="guides-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guides (e.g., 'password reset', 'studio canvas', 'sizing', 'hero anchor')..."
            style={{
              width: '100%',
              padding: '0.85rem 1.25rem 0.85rem 2.85rem',
              fontSize: '0.9rem',
              borderRadius: '28px',
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg, #FFFFFF)',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          <span style={{ position: 'absolute', left: '1.15rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
            🔍
          </span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: '0.85rem'
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Category Navigation Pills */}
      <div className="guides-category-scroll-container" style={{ marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.6rem', minWidth: 'max-content' }}>
          {GUIDE_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                className={`guides-category-pill ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSearchQuery('');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 1.15rem',
                  fontSize: '0.8rem',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  border: isSelected ? '1px solid var(--accent, #D4AF37)' : '1px solid var(--border-color)',
                  background: isSelected ? 'var(--accent, #D4AF37)' : 'rgba(255, 255, 255, 0.6)',
                  color: isSelected ? '#FFFFFF' : 'var(--foreground)',
                  fontWeight: isSelected ? 600 : 400,
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>{cat.icon}</span>
                <span>{cat.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Guides Grid / List */}
      {filteredArticles.length === 0 ? (
        <div className="lookbook-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            No guides match your search term &quot;{searchQuery}&quot;.
          </p>
          <button
            type="button"
            className="accent-button"
            style={{ width: 'auto', margin: '0 auto' }}
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
          >
            Reset Search &amp; View All Guides
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {filteredArticles.map((article) => (
            <article
              key={article.id}
              id={article.id}
              className="lookbook-panel guide-article-card"
              style={{ padding: '2.25rem', scrollMarginTop: '6rem' }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                    {article.badge && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '12px',
                          background: 'rgba(212, 175, 55, 0.15)',
                          color: 'var(--accent, #9A7B20)',
                          fontWeight: 600
                        }}
                      >
                        {article.badge}
                      </span>
                    )}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      ⏱️ {article.readingTime}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.6rem', fontFamily: 'var(--font-serif)', color: 'var(--foreground)', margin: 0 }}>
                    {article.title}
                  </h3>
                </div>

                {onNavigateTab && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {article.category === 'stylist' && (
                      <button
                        type="button"
                        onClick={() => onNavigateTab('stylist')}
                        className="guide-action-pill"
                      >
                        Open Stylist ↗
                      </button>
                    )}
                    {article.category === 'studio' && (
                      <button
                        type="button"
                        onClick={() => onNavigateTab('studio')}
                        className="guide-action-pill"
                      >
                        Open Studio ↗
                      </button>
                    )}
                    {article.category === 'capsule' && (
                      <button
                        type="button"
                        onClick={() => onNavigateTab('capsule')}
                        className="guide-action-pill"
                      >
                        Open Capsules ↗
                      </button>
                    )}
                    {article.category === 'wardrobe' && (
                      <button
                        type="button"
                        onClick={() => onNavigateTab('wardrobe')}
                        className="guide-action-pill"
                      >
                        Open Wardrobe ↗
                      </button>
                    )}
                    {article.category === 'profile' && (
                      <button
                        type="button"
                        onClick={() => onNavigateTab('account')}
                        className="guide-action-pill"
                      >
                        Open Profile ↗
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Summary Lead */}
              <p style={{ fontSize: '1rem', lineHeight: '1.6', color: 'var(--foreground)', fontStyle: 'italic', marginBottom: '1.75rem', borderLeft: '3px solid var(--accent, #D4AF37)', paddingLeft: '1rem' }}>
                {article.summary}
              </p>

              {/* Sections */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                {article.sections.map((sec, sIdx) => (
                  <div key={sIdx} className="guide-sub-section">
                    <h4 style={{ fontSize: '1.15rem', color: 'var(--accent-gold, #A3842C)', marginBottom: '0.6rem', fontWeight: 600 }}>
                      {sec.heading}
                    </h4>

                    {sec.content.map((p, pIdx) => (
                      <p key={pIdx} style={{ fontSize: '0.9rem', color: 'var(--foreground)', lineHeight: '1.65', marginBottom: '0.6rem' }}>
                        {p}
                      </p>
                    ))}

                    {/* Sequential Steps */}
                    {sec.steps && sec.steps.length > 0 && (
                      <ol style={{ margin: '0.75rem 0 1rem', paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {sec.steps.map((st, stIdx) => (
                          <li
                            key={stIdx}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.75rem',
                              fontSize: '0.88rem',
                              lineHeight: '1.5',
                              background: 'rgba(255, 255, 255, 0.02)',
                              border: '1px solid var(--border-color)',
                              padding: '0.65rem 0.9rem',
                              borderRadius: '6px'
                            }}
                          >
                            <span
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: 'var(--accent, #D4AF37)',
                                color: '#FFFFFF',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                marginTop: '1px'
                              }}
                            >
                              {stIdx + 1}
                            </span>
                            <span>{st}</span>
                          </li>
                        ))}
                      </ol>
                    )}

                    {/* Callout Box */}
                    {sec.callout && (
                      <div
                        style={{
                          margin: '0.85rem 0',
                          padding: '0.9rem 1.15rem',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          lineHeight: '1.5',
                          border:
                            sec.callout.type === 'tip'
                              ? '1px solid rgba(212, 175, 55, 0.4)'
                              : sec.callout.type === 'important'
                              ? '1px solid rgba(239, 68, 68, 0.4)'
                              : '1px solid var(--border-color)',
                          background:
                            sec.callout.type === 'tip'
                              ? 'rgba(212, 175, 55, 0.06)'
                              : sec.callout.type === 'important'
                              ? 'rgba(239, 68, 68, 0.06)'
                              : 'rgba(255, 255, 255, 0.02)'
                        }}
                      >
                        <strong>
                          {sec.callout.type === 'tip' && '💡 Pro-Tip: '}
                          {sec.callout.type === 'important' && '⚠️ Important: '}
                          {sec.callout.type === 'info' && 'ℹ️ Note: '}
                        </strong>
                        <span>{sec.callout.text}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* FAQs Accordion */}
              {article.faqs && article.faqs.length > 0 && (
                <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                  <h5 style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                    Frequently Asked Questions
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {article.faqs.map((faq, fIdx) => {
                      const faqKey = `${article.id}-faq-${fIdx}`;
                      const isExpanded = !!expandedFaqs[faqKey];
                      return (
                        <div
                          key={fIdx}
                          style={{
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            background: 'rgba(255, 255, 255, 0.01)'
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => toggleFaq(faqKey)}
                            style={{
                              width: '100%',
                              padding: '0.8rem 1rem',
                              textAlign: 'left',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '0.88rem',
                              fontWeight: 600,
                              color: 'var(--foreground)'
                            }}
                          >
                            <span>{faq.question}</span>
                            <span>{isExpanded ? '▲' : '▼'}</span>
                          </button>
                          {isExpanded && (
                            <div style={{ padding: '0.8rem 1rem 1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.55', background: 'rgba(255, 255, 255, 0.02)' }}>
                              {faq.answer}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Footer Support Callout */}
      <div className="lookbook-panel" style={{ padding: '2rem', marginTop: '2.5rem', textAlign: 'center' }}>
        <h4 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', fontFamily: 'var(--font-serif)' }}>
          Have a question not covered here?
        </h4>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 1.25rem' }}>
          Our styling curators and technical engineering team are here to assist with custom wardrobe ingestion or styling requests.
        </p>
        <a
          href="mailto:concierge@atelieredit.info"
          className="accent-button"
          style={{ width: 'auto', display: 'inline-block', textDecoration: 'none', padding: '0.6rem 1.5rem', fontSize: '0.8rem' }}
        >
          Contact Atelier Concierge
        </a>
      </div>

    </div>
  );
};
