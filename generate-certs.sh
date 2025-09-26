#!/bin/bash

# Create certs directory
mkdir -p certs

# Generate self-signed certificate for localhost and your IP
openssl req -x509 -out certs/localhost.pem -keyout certs/localhost-key.pem \
  -newkey rsa:2048 -nodes -sha256 \
  -subj '/CN=localhost' -extensions EXT -config <( \
   printf "[dn]\nCN=localhost\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:10.19.236.31\nkeyUsage=keyEncipherment,dataEncipherment\nextendedKeyUsage=serverAuth")

echo "SSL certificates generated in ./certs/"
echo "You can now run: npm run dev:https"