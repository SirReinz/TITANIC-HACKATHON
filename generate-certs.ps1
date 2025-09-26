# PowerShell script to generate self-signed certificates
Write-Host "Creating certificates directory..."
if (!(Test-Path "certs")) {
    New-Item -ItemType Directory -Path "certs"
}

Write-Host "Generating self-signed certificate..."

# Create certificate for localhost and your network IP
$cert = New-SelfSignedCertificate -DnsName "localhost", "10.19.236.31", "127.0.0.1" -CertStoreLocation "cert:\LocalMachine\My" -KeyUsage KeyEncipherment,DataEncipherment -KeyAlgorithm RSA -KeyLength 2048

# Export certificate
$pwd = ConvertTo-SecureString -String "password" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "certs\localhost.pfx" -Password $pwd

# Convert to PEM format using OpenSSL (if available)
Write-Host "Certificates generated!"
Write-Host "Note: You might need to install OpenSSL to convert to PEM format"
Write-Host "Or use the mkcert tool for easier certificate generation"