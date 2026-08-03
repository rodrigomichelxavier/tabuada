# Tabuada Quest

Jogo web mobile-first para crianças praticarem as tabuadas de 2 a 10 de forma gamificada.

## Modos de sessão

- **Praticar pelo conhecimento:** joga livremente, sem configurar recompensa.
- **Disputar por um prêmio:** um responsável define o prêmio e a quantidade de moedas necessária.

## Modos de jogo

- **Escolha uma tabuada:** a tabuada escolhida é o ponto de partida. Ao completar suas dez contas, o jogo contabiliza os pontos e avança automaticamente. Depois da tabuada do 10, continua pela do 2 até que todas tenham sido concluídas.
- **Modo sortido:** embaralha as 90 contas das tabuadas de 2 a 10. Uma conta respondida incorretamente volta para a fila e só é removida quando for resolvida.
- Antes da jornada sequencial, a criança pode jogar imediatamente ou revisar a primeira tabuada no modo **Memorizar**.

Cada acerto vale uma moeda, respostas em menos de cinco segundos recebem uma moeda adicional e cada tabuada completa rende dez moedas de bônus.

## Atualização e uso offline

O projeto é uma PWA. O service worker tenta buscar primeiro a versão mais recente dos arquivos e usa o cache somente quando não há rede. Quando uma nova versão do service worker é ativada, os caches anteriores são removidos e as páginas abertas são atualizadas automaticamente.

## Rodar localmente

```bash
npm start
```

Depois, acesse `http://localhost:4173`.

## Publicar no GitHub Pages

O workflow em `.github/workflows` publica automaticamente a branch `main`.

1. Em **Settings → Pages**, escolha **GitHub Actions** como fonte.
2. Envie as alterações para a branch `main` ou execute manualmente o workflow **Publicar no GitHub Pages**.
3. A aplicação ficará disponível em `https://<usuario-ou-org>.github.io/tabuada/`.

## Verificação

```bash
npm run check
```
