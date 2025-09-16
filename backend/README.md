# Commandes pour initialiser le backend Express multitenant avec Prisma

cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm start

# Assure-toi d'avoir une variable DATABASE_URL dans .env, exemple :
# DATABASE_URL="postgresql://user:password@localhost:5432/nom_de_la_db"
