#!/bin/bash

export ORIONDB_PASSWORD=`cat $ORIONDB_PASSWORD_FILE`
#export MONGO_INITDB_ROOT_PASSWORD=`cat $MONGO_INITDB_ROOT_PASSWORD_FILE`

mongo -u $MONGO_INITDB_ROOT_USERNAME -p $MONGO_INITDB_ROOT_PASSWORD $MONGO_INITDB_DATABASE << EOF
db.createUser({ user: 'orion', pwd: "$ORIONDB_PASSWORD", roles: [ { role: 'userAdminAnyDatabase', db: 'admin'}, { role: 'readWriteAnyDatabase', db: 'admin'}, {role: 'dbAdminAnyDatabase', db: 'admin'} ] } );
EOF