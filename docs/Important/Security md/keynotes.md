prestinespaces.cleaningco@gmail.com
3Ld0r@do71730

INTERNAL_SECRET=d915932319800fb24edb6762f72c0d4d35716f031219999fe81aa8db51657742
INTERNAL_SECRET=de630b7dc76542de8ee02826ed7df1ed6b36b7d0f9e2aace1d57beee22129224
r3v@penguin:~$ 



passphrase: encrption for secrets: d29yZENvZGU9amFkZS1ncmFjaW91cy1iYWxhbmNlJmhvc3RuYW1lPXBlbmd1aW4

AGI-Suite; 
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

Stable
api: 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

claude: 
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

# Add your key
sed -i 's/ANTHROPIC_API_KEY=/ANTHROPIC_API_KEY=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/' artifacts/api-server/.env
# Verify (should show key is set, not blank)
grep ANTHROPIC_API_KEY artifacts/api-server/.env

github Token: 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
Classic Token: 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

89aaa-55270
08670-724a0
58aad-0269c
07e87-e8c3f
e8bc0-92309
4bfc7-7bc2c
8547f-ce16a
36183-456a8
57115-5280b
d1e06-17bac
d7f53-b4c2c
40c14-f10b3
54681-81fa8
7c255-e182b
0520a-79bdf
3a0b1-d32c9


# Set a password for r3 user
sudo -u postgres psql -c "ALTER USER r3 PASSWORD 'r3local';"

# Update .env with password and disable SSL for local
cat > ~/Stable/.env << 'EOF'
DATABASE_URL="postgresql://r3:r3local@localhost:5432/r3vibe"
DATABASE_SSL=false
EOF


echo 'ADMIN_PASSWORD=your-strong-password-here' >> .env

cat ~/Stable/.env

https://railway.com/project/681d053a-c749-43f6-b3b2-0f5ff4f202f3/service/e1358993-8816-457b-8ca7-5f541f6449e1/database?environmentId=e038988e-67e8-4f11-b69e-750657071267
 PGPASSWORD=LViQcQVFGejcUTDHttLzrdTlqdCFowIr psql -h ballast.proxy.rlwy.net -U postgres -p 25291 -d railway

Working credentials:

URL: http://localhost
Username: admin
Password: changeme123
JWT works, tier pro_artist, full admin


export ANTHROPIC_KEY="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"
sed -i "s|ANTHROPIC_API_KEY=.*|"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"|" ~/Stable/.env
sed -i "s|ANTHROPIC_API_KEY=.*|"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"|" ~/Stable/.env.production
unset ANTHROPIC_KEY
grep ""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"" ~/Stable/.env ~/Stable/.env.production

git push https://Berryboy93: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@github.com/Berryboy93/r3v4.git main
git push https://Berryboy93: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@github.com/Berryboy93/r3v4.git main 2>&1

cp ~/Downloads/r3_hygiene.py ~/Stable/r3_hygiene.py
python3 ~/Stable/r3_hygiene.py --skip-tests

postgresql://r3:r3local@localhost:5432/r3vibe
export DATABASE_URL="postgresql://r3:r3admin2023@localhost:5432/r3vibe" -c "\conninfo"
postgresql://r3:r3vibe@localhost:5432/r3vibe


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


Then start dev and log in with admin / changeme123:

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




DATABASE_URL="postgresql://PGUSER:kgNcighIkTpIQERColEJXyRQTwAFPZYV:5432/PGDATABASE" node -e "
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



postgresql://r3:r3vibe@localhost:5432/r3vibe

DATABASE_URL="postgresql://r3:r3vibe@localhost:5432/r3vibe" node -e "
const {Pool} = require('pg');
const pool = new Pool({connectionString: process.env.DATABASE_URL});
pool.query('SELECT 1').then(() => { console.log('CONNECTED \u2705'); pool.end(); }).catch(e => { console.error('FAILED:', e.message); pool.end(); });
"

DATABASE_URL="<postgresql://r3:r3vibe@localhost:5432/r3vibe>" node -e "
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


echo 'DATABASE_URL=postgresql:/ postgresql://r3:r3admin2023@localhost:5432/r3vibe' > /tmp/db.env


node --env-file=/tmp/db.env -e "
const {Pool} = require('pg');
const pool = new Pool({connectionString: process.env.DATABASE_URL});
pool.query('SELECT 1').then(() => { console.log('CONNECTED'); pool.end(); }).catch(e => { console.error('FAILED:', e.message); pool.end(); });
"


cat > ~/Agi-Suite/apps/api-server/.env << 'EOF'
PORT=3001
NODE_ENV=development
ANTHROPIC_API_KEY=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
DATABASE_URL=postgresql://r3:r3vibe@localhost:5432/r3vibe
EOF