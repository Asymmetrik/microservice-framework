#!/bin/bash

set -e

source ./docker/helpers/source_secrets.sh

if [[ "$1" = 'start-server' ]]; then
	exec npm run test

elif [[ "$1" = 'debug-server' ]]; then

	# Run the server with nodemon
	exec npm run debug
fi

exec "$@"