'use client';

import Image from 'next/image';
import { useState } from 'react';
import { SafeImage } from './SafeImage';
import type { WhatsNewPost } from '@/lib/whatsNew';

function isOwnImage(url: string): boolean {
  return url.startsWith('/') || url.startsWith('https://storage.googleapis.com/');
}

/**
 * One What's New post: the trend, how to wear it with pieces the person already owns,
 * at most one piece worth adding, and a link back to the article it came from.
 */
export function WhatsNewCard({ post }: { post: WhatsNewPost }) {
  const [heroFailed, setHeroFailed] = useState(false);
  const sourceHost = (() => {
    try {
      return post.sourceUrl ? new URL(post.sourceUrl).hostname.replace(/^www\./, '') : null;
    } catch {
      return null;
    }
  })();

  return (
    <article className="whatsnew-card">
      {post.imageUrl && !heroFailed && (
        <div className="whatsnew-image">
          <Image
            src={post.imageUrl}
            onError={() => setHeroFailed(true)}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 640px"
            style={{ objectFit: 'cover' }}
            // Article preview images are shown from the publisher's own server, not copied
            unoptimized={!isOwnImage(post.imageUrl)}
          />
        </div>
      )}

      <div className="whatsnew-body">
        <p className="whatsnew-source">
          {post.source}
          {post.createdAt && (
            <> · {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</>
          )}
        </p>
        <h3 className="whatsnew-title">{post.title}</h3>
        <p className="whatsnew-summary">{post.summary}</p>

        {post.pieces && post.pieces.length > 0 && (
          <div className="whatsnew-pieces">
            <p className="whatsnew-label">From your wardrobe</p>
            <ul>
              {post.pieces.map((piece) => (
                <li key={piece.id}>
                  <div className="whatsnew-piece-image">
                    <SafeImage src={piece.imageUrl} alt={piece.label} fill sizes="72px" style={{ objectFit: 'cover' }} />
                  </div>
                  <span>{piece.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {post.suggestedPiece && (
          <p className="whatsnew-suggestion">
            <span className="whatsnew-label">Worth adding</span> {post.suggestedPiece}
          </p>
        )}

        <div className="whatsnew-footer">
          {post.tags && post.tags.length > 0 && (
            <ul className="whatsnew-tags">
              {post.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          )}
          {post.sourceUrl && (
            <a className="whatsnew-read" href={post.sourceUrl} target="_blank" rel="noopener noreferrer">
              Read at {sourceHost || post.source} →
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
