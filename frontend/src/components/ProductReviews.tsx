import React, { useCallback, useEffect, useState } from 'react';
import { Star } from 'lucide-react';

interface ReviewItem {
  _id?: string;
  customerName?: string;
  rating: number;
  comment?: string;
  createdAt?: string;
}
interface Summary {
  average: number;
  count: number;
  distribution: number[]; // index 0 => 1 star
}

const Stars: React.FC<{ value: number; size?: number }> = ({ value, size = 16 }) => (
  <span className="inline-flex items-center">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        size={size}
        className={i <= Math.round(value) ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}
      />
    ))}
  </span>
);

/** PDP "Ratings & reviews" — public list + a verified-purchase write form. */
export const ProductReviews: React.FC<{ productId: string }> = ({ productId }) => {
  const [summary, setSummary] = useState<Summary>({ average: 0, count: 0, distribution: [0, 0, 0, 0, 0] });
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const customerUser = (() => {
    try {
      const c = localStorage.getItem('customer_user');
      return c ? JSON.parse(c) : null;
    } catch {
      return null;
    }
  })();

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/products/${encodeURIComponent(productId)}/reviews`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) {
          setSummary(d.summary || { average: 0, count: 0, distribution: [0, 0, 0, 0, 0] });
          setReviews(Array.isArray(d.reviews) ? d.reviews : []);
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (rating < 1) {
      setFeedback({ ok: false, msg: 'Tap a star to rate this product.' });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const phone = customerUser?.phone ? customerUser.phone.replace(/\D/g, '').slice(-10) : '';
      const res = await fetch(`/api/products/${encodeURIComponent(productId)}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, rating, comment }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setFeedback({ ok: false, msg: data?.message || 'Could not submit your review.' });
        return;
      }
      setFeedback({
        ok: true,
        msg: data.updated
          ? 'Review updated — pending approval.'
          : 'Thanks! Your review is pending approval.',
      });
      setShowForm(false);
      setRating(0);
      setComment('');
    } catch {
      setFeedback({ ok: false, msg: 'Could not submit your review. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-12 pt-8 border-t border-gray-200">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-black text-gray-900">Ratings &amp; reviews</h2>
        {customerUser && (
          <button
            onClick={() => {
              setShowForm((s) => !s);
              setFeedback(null);
            }}
            className="text-[#0c831f] text-sm font-black hover:underline cursor-pointer"
          >
            {showForm ? 'Cancel' : 'Write a review'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="mt-4 h-20 rounded-2xl bg-gray-100 animate-pulse" />
      ) : summary.count === 0 ? (
        <p className="mt-3 text-sm text-gray-500 font-medium">
          No reviews yet. Received this item? Be the first to review it.
        </p>
      ) : (
        <div className="mt-4">
          <div className="flex items-center gap-4">
            <span className="text-4xl font-black text-gray-900">{summary.average.toFixed(1)}</span>
            <div>
              <Stars value={summary.average} />
              <p className="text-xs text-gray-500 font-semibold mt-1">
                {summary.count} {summary.count === 1 ? 'review' : 'reviews'}
              </p>
            </div>
          </div>
          <ul className="mt-5 space-y-4">
            {reviews.slice(0, 8).map((r, i) => (
              <li key={r._id || i} className="border-b border-gray-100 pb-4 last:border-0">
                <div className="flex items-center gap-2">
                  <Stars value={r.rating} size={13} />
                  <span className="text-sm font-bold text-gray-900 truncate">
                    {r.customerName || 'Customer'}
                  </span>
                </div>
                {r.comment && (
                  <p className="mt-1 text-sm text-gray-600 leading-relaxed">{r.comment}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {feedback && (
        <p
          className={`mt-3 text-sm font-semibold ${
            feedback.ok ? 'text-[#0c831f]' : 'text-rose-600'
          }`}
        >
          {feedback.msg}
        </p>
      )}

      {showForm && customerUser && (
        <div className="mt-4 bg-[#F8F9FA] border border-gray-200/80 rounded-2xl p-5">
          <p className="text-xs text-gray-500 font-semibold mb-2">
            Only customers who received this item can review it.
          </p>
          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i)}
                className="p-0.5 cursor-pointer"
                aria-label={`${i} star${i > 1 ? 's' : ''}`}
              >
                <Star
                  size={28}
                  className={i <= rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}
                />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="How was the quality, freshness, packaging?"
            className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c831f]/30"
          />
          <button
            onClick={submit}
            disabled={submitting}
            className="mt-3 bg-[#0c831f] hover:bg-[#0a6f1a] disabled:opacity-60 text-white font-extrabold text-sm px-6 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            {submitting ? 'Submitting…' : 'Submit review'}
          </button>
        </div>
      )}
    </div>
  );
};
