FROM node:6.9

# npm build the application, then install additional files
WORKDIR /srv/app

RUN echo "unsafe-perm = true" > /root/.npmrc

COPY package.json /srv/app/
RUN npm install --loglevel=warn
COPY . /srv/app/

ENV PATH="/srv/app:${PATH}"

CMD ["npm", "test"]
