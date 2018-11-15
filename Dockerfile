FROM node:9.11.1-alpine
WORKDIR /app
# ENV WEBSERVER_ADDR=http://docker.for.mac.localhost:3075
# ENV LOCAL=true
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "start"]
