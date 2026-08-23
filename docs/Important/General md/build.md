## How to Test ##

1. Rebuild and Start Your App
Depending on your setup (most likely one of these in ~/Stable/):

	bash
# cd ~/Stable/client
Install dependencies if needed
# pnpm install   # or npm install / yarn install

Build (optional, for strictness)
# pnpm run build   # or npm run build / yarn build

# Start dev server
pnpm run dev     # or npm run dev / yarn dev



2. Navigate to the App in the Browser
Open your browser to the local server URL (usually http://localhost:3000 or as printed in your console).
Login if required.



3. Manual Feature Tests
Go directly to /mixer and verify:
There is only one transport bar at the top.
All track controls, imports, transport, play/record, etc. function as before.



# Visit any other relevant DAW routes: /multitrack, /daw, /collab, main page. #

Try actions that previously might have touched modular code, like:
# Creating/removing tracks
# Loading/saving projects
# Toggling mixer/timeline views
# Open the browser dev console:
# Check for JS or TypeScript runtime errors, red errors, or uncaught exceptions.

4.Type Checking (if you want)
You can also run:

# bash
# pnpm run typecheck   # or npm run typecheck / yarn typecheck
Expect no new errors (apart from those previously suppressed by @ts-nocheck).

5. Automated Tests (if any)
If your repo has automated tests, you can run:

# bash
# pnpm run test    # or npm test / yarn test
What to Watch For The app builds and reloads quickly
No runtime errors about missing modules (especially around MultitrackPanel). No broken references to ./multi-track-panel/index.ts or other deleted modular code /mixer page displays a single transport bar (your Phase A patch at work!).

# If Anything Fails
	Paste the error or screenshot here—I’ll triage root cause and tell you if it’s related to the modular deletion or another issue
If anything about the MultitrackPanel is broken, we’ll know exactly what code needs adjusting.

# If Tests Pass
	Proceed to update banners/comments/final git commit as described above.

## Celebrate! 🎉 ##

DATABASE_URL=postgresql://postgres:kgNcighIkTpIQERColEJXyRQTwAFPZYV@ballast.proxy.rlwy.net:25291/railway

PGPASSWORD=kgNcighIkTpIQERColEJXyRQTwAFPZYV psql -h ballast.proxy.rlwy.net -U postgres -p 25291 -d railway

  pnpm drizzle-kit migrate
railway connect Postgres


cd ~/Stable
DATABASE_URL="postgresql://postgres:kgNcighIkTpIQERColEJXyRQTwAFPZYV@ballast.proxy.rlwy.net:25291/railway" \
  pnpm drizzle-kit migrate


DATABASE_URL=postgresql://postgres:kgNcighIkTpIQERColEJXyRQTwAFPZYV@ballast.proxy.rlwy.net:5432/railway \
  node -e "
const {Pool} = require('pg');
const pool = new Pool({connectionString: process.env.DATABASE_URL});
pool.query(\"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name\")
  .then(r => {
    console.log('Tables found:', r.rows.length);
    r.rows.forEach(t => console.log('  ' + t.table_name));
    pool.end();
  })
  .catch(e => { console.error('FAILED:', e.message); pool.end(); });
"


Then start dev and log in with r3admin / r3admin2024:

psql postgresql://r3:r3vibe@localhost:5432/r3vibe -c "
INSERT INTO users (id, username, password, email, tier, is_admin)
VALUES (
  gen_random_uuid(),
  'r3admin',
  '\$2b\$12\$hTzofp6lgqoqYE0M39aEjemz1/3i.T2jKdDJYWCHO67gIV8TSUmSG',
  'admin@r3vibe.com',
  'pro',
  true
) ON CONFLICT (username) DO NOTHING;
"
