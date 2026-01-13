# Controle de Compras Mensais (Firestore)

## Como rodar
Você precisa abrir com um servidor local (não pode abrir via file://).

### Opção A (VS Code)
- Instale a extensão Live Server
- Clique com direito em `index.html` -> Open with Live Server

### Opção B (Python)
Na pasta do projeto:
```bash
python -m http.server 5500
```
Acesse:
- http://127.0.0.1:5500/index.html

## Telas
- `dashboard.html` (cards + gráficos)
- `importar.html` (importação Excel + preview + salvar)

## Firestore
Coleções:
- `compras`
- `resumoMensal` (documento com ID = mes, ex: 2026-01)

## Regras (para teste)
No Firestore -> Regras, use temporariamente:
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
Depois a gente fecha com login.
