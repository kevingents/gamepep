// Publieke Supabase-gegevens. Deze TWEE mogen in de client/repo staan: ze zijn
// openbaar (elke Supabase-webapp stuurt ze mee in de browser) en worden
// beschermd door Row Level Security in de database. De GEHEIME sleutels
// (service_role, secret, jwt secret, postgres-wachtwoord) horen HIER NOOIT —
// die blijven alleen in Vercel.
export const SUPA_URL = 'https://kbixqqehmjykerdpujri.supabase.co'
export const SUPA_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaXhxcWVobWp5a2VyZHB1anJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNjIwNzAsImV4cCI6MjA5NjczODA3MH0.HHO__lTJp4KmXtCNcQtvRnp6K3DFVccpxk-Zo5HagnM'
