# CORS do Firebase Storage (para upload de PDF no navegador)

Se você estiver rodando o app no navegador (ex.: Live Server 5500 / Vite 5173) e o upload do PDF der erro de CORS,
rode o script abaixo para habilitar CORS no bucket do Storage.

## Pré-requisito
- Instale o Google Cloud SDK (gcloud + gsutil)

## Como aplicar
1. Abra esta pasta: tools/storage-cors
2. Execute: aplicar-cors.bat
3. Feche e reabra o navegador
4. Teste o upload do PDF novamente

Bucket alvo:
- gs://controle-compras-ab501.firebasestorage.app
