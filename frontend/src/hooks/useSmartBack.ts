import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Returns a `goBack` function that pops the real browser/router history
 * when this page was reached via in-app navigation (so "Back" always
 * lands wherever the user actually came from — Home, a category, etc.),
 * and falls back to a fixed route only when the page was opened directly
 * (no prior history in this session, e.g. a fresh tab or deep link) —
 * `location.key === 'default'` identifies that case.
 *
 * Special case: the Customer Profile drawer is a UI overlay on top of
 * "/" rather than its own route, so there's no history entry to pop back
 * to. Pages reached from it (Orders, Support, Addresses, Profile) get
 * navigated here with `state: { from: 'profile' }`; goBack then routes
 * home with `state: { openProfile: true }` so the Header can reopen the
 * drawer instead of just landing on a bare Home page.
 */
export function useSmartBack(fallback: string = '/') {
  const navigate = useNavigate();
  const location = useLocation();

  return () => {
    const from = (location.state as { from?: string } | null)?.from;
    if (from === 'profile') {
      navigate('/', { state: { openProfile: true } });
    } else if (location.key && location.key !== 'default') {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };
}
