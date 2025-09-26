# HTTPS Setup for Development

## USE NGROK

Use ngrok to create an HTTPS tunnel:
```bash
npm run dev
# Install ngrok
# Then run:
ngrok http 9002
```

This will give you an HTTPS URL that tunnels to your local HTTP server.