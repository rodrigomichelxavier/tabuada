# Tabuada Quest

Aplicação web gamificada, mobile first, para crianças de 7 a 10 anos praticarem tabuadas do 2 ao 10.

## Como jogar

1. Abra a aplicação e toque em **Iniciar aventura**.
2. Escolha uma tabuada de 2 a 10 ou use a opção **Sortear tabuada**.
3. Ao escolher uma tabuada específica, selecione **Jogar** ou **Memorizar**.
4. Responda às contas para ganhar moedas:
   - Cada acerto vale **1 moeda**.
   - Respostas certas em menos de **5 segundos** ganham **+1 moeda** de bônus de velocidade.
   - Cada tabuada completa gabaritada vale **+10 moedas bônus**.
5. Use **Escolher outra Tabuada** para trocar de missão mantendo as moedas acumuladas.
6. Toque em **Finalizar e Contar Moedas** para converter moedas em tempo de celular.

## Conversão de recompensa

Cada **20 moedas** conquistadas equivalem a **5 minutos** de tempo no celular. A tela final mostra a recompensa em formato **HH:MM**, para que os pais possam liberar o uso conforme o desempenho da criança.


## Instalar no celular

A aplicação também foi preparada como **PWA**. Depois de publicada no GitHub Pages, ela pode ser adicionada à tela inicial do celular com ícone de calculadora e abertura em modo aplicativo.

- **Android/Chrome:** abra a URL publicada, toque no menu `⋮` e escolha **Adicionar à tela inicial** ou **Instalar app**.
- **iPhone/Safari:** abra a URL publicada, toque em **Compartilhar** e escolha **Adicionar à Tela de Início**.

O app inclui `manifest.webmanifest`, ícone SVG de calculadora e `service-worker.js` para permitir instalação e cache básico dos arquivos sem arquivos binários no PR.

## Rodar localmente

```bash
npm start
```

Depois acesse `http://localhost:4173`.


## Testar publicado na web

Este repositório inclui um workflow do GitHub Pages para publicar a aplicação automaticamente quando o código chegar na branch `main`.

1. No GitHub, abra **Settings → Pages**.
2. Em **Build and deployment**, selecione **GitHub Actions** como fonte.
3. Faça merge/push na branch `main` ou rode manualmente o workflow **Publicar no GitHub Pages** na aba **Actions**.
4. A aplicação ficará disponível em uma URL no formato:

```text
https://<seu-usuario-ou-org>.github.io/tabuada/
```

## Verificação rápida

```bash
npm run check
```
