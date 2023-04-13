FROM node:16-alpine
WORKDIR /app
COPY package.json /app
RUN yarn install --frozen-lockfile
COPY . /app
RUN yarn build
CMD ["yarn", "startprod"]