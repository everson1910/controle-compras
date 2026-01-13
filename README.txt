Controle de Compras (Firebase)

1) Abra com Live Server (VS Code).
2) A página inicial agora é: index.html (Login).
3) Se der erro auth/unauthorized-domain:
   Firebase Console → Authentication → Settings → Authorized domains
   Adicione: localhost e 127.0.0.1

Firestore:
- months/{YYYY-MM}/categories/{categoria}

Regras mínimas recomendadas (somente logado):
match /{document=**} { allow read, write: if request.auth != null; }
