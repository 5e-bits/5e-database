# This recipe is pulled from: https://stackoverflow.com/a/33601894

# Parent Dockerfile https://github.com/docker-library/mongo/blob/982328582c74dd2f0a9c8c77b84006f291f974c3/3.0/Dockerfile
FROM mongo:6.0.1

# Modify child mongo to use /data/db2 as dbpath (because /data/db wont persist the build)
COPY ./docker/mongodb.conf /etc
RUN mkdir -p /data/db2 \
  && chown -R mongodb:mongodb /data/db2

RUN apt-get update \
  && apt-get -y install curl \
  && apt-get clean \
  && rm -rf /var/apt/lists/*
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get install -y nodejs \
  && apt-get clean \
  && rm -rf /var/apt/lists/*

ENV MONGODB_URI mongodb://localhost:27017/5e-database

## Add code
WORKDIR /data/db2
COPY --chown=mongodb:mongodb package.json package-lock.json /data/db2/
RUN npm install
COPY --chown=mongodb:mongodb . /data/db2/


RUN mongod --fork --logpath /var/log/mongodb.log --dbpath /data/db2 \
  && npm run db:refresh \
  && mongod --dbpath /data/db2 --shutdown \
  && chown -R mongodb:mongodb /data/db2

# Make the new dir a VOLUME to persists it
VOLUME /data/db2

HEALTHCHECK CMD curl --connect-timeout 10 --silent --fail http://localhost:27017 || exit 1

CMD ["mongod", "--config", "/etc/mongodb.conf"]
