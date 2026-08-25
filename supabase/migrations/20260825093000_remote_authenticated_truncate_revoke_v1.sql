-- Remote security remediation candidate.
-- Apply only through the approved migration workflow after independent review.
revoke truncate on table public.profiles, public.tenants from authenticated;
