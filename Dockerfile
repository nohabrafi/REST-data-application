FROM node:14

# Create app directory
WORKDIR /usr/REST-data-app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install


# Bundle app source
COPY . .

EXPOSE 3000
CMD [ "node", "./server/server.js" ]