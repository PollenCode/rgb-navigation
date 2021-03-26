#/bin/bash -e

rm -rf build
mkdir build

cd client
yarn build
cd ..
cp -r client/build build/public

cp -r server/prisma build
cp server/package.json build
cp server/.env.example build/.env

cd server
yarn build
cd ..

cp -r server/dist build/src
