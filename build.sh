#/bin/bash -e

rm -rf build
mkdir build build/server

cd api
yarn build
cd ..

cd client
yarn build
cd ..
cp -r client/build build/server/public

cp -r server/prisma build/server
cp server/package.json build/server
cp server/.env.example build/server/.env

cd server
yarn build
cd ..

cp -r api build/api
cp -r server/dist build/server/src
