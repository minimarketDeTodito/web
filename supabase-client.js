(function () {
  const c = window.DETODITO_CONFIG || {};
  const ready = Boolean(
    /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(c.supabaseUrl || '') &&
    typeof c.supabaseAnonKey === 'string' &&
    c.supabaseAnonKey.startsWith('sb_publishable_') &&
    window.supabase?.createClient
  );
  window.detoditoReady = ready;
  if (ready) {
    window.detoditoDB = window.supabase.createClient(c.supabaseUrl, c.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
  }
})();
