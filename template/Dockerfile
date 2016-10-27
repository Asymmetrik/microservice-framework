FROM node:0.12.14

## Install AWS CLI
RUN apt-get update && apt-get install unzip
WORKDIR /opt/aws
RUN curl "https://s3.amazonaws.com/aws-cli/awscli-bundle.zip" -o "awscli-bundle.zip"
RUN unzip awscli-bundle.zip
RUN ./awscli-bundle/install -i /usr/local/aws -b /usr/local/bin/aws
RUN rm -rf awscli-bundle awscli-bundle.zip

WORKDIR /usr/src/app

COPY package.json /usr/src/app/
RUN npm install
COPY . /usr/src/app/

ENV PATH="/usr/src/app:${PATH}"

ENTRYPOINT ["./Entrypoint.sh"]
CMD ["npm", "start"]
