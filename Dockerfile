FROM node:14-alpine

ENV NODE_ENV=development

WORKDIR /app
COPY client ./client
COPY server ./server
COPY compiler ./compiler
COPY api ./api
COPY build.sh ./build.sh
RUN chmod +x build.sh
RUN ./build.sh

ENV NODE_ENV=production

WORKDIR /app/build/compiler
RUN yarn install --frozen-lockfile
WORKDIR /app/build/api
RUN yarn install --frozen-lockfile
WORKDIR /app/build/server
RUN yarn install --frozen-lockfile

RUN npx prisma generate
# RUN npx prisma migrate deploy

CMD ["node", "src/index.js"] 