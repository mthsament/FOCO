# Mascote Canguru — projeto organizado

## Como abrir
1. Extraia a pasta/ZIP mantendo a estrutura.
2. Abra `index.html` em um navegador moderno. Para evitar restrições de `file://` ao carregar JSON e recursos, prefira iniciar um servidor local:
   - VS Code: extensão **Live Server** → botão direito em `index.html` → **Open with Live Server**.
   - Python: `python -m http.server 8000` na pasta do projeto e acesse `http://localhost:8000`.
3. Escolha uma das 12 páginas no índice.

## Estrutura
- `index.html`: página inicial com links para todos os módulos.
- `pages/<pagina>/index.html`: entrada individual de cada página.
- `pages/<pagina>/template.html`: estrutura HTML original da página.
- `pages/<pagina>/styles.css`: estilos extraídos do HTML original.
- `pages/<pagina>/logic.js`: lógica específica do componente original.
- `pages/<pagina>/config.json`: manifesto de recursos da página.
- `js/page-loader.js`: carregador compartilhado do runtime e dos recursos.
- `assets/`: imagens, fontes e bibliotecas originais, deduplicadas por hash.

## Preservação
Os 12 módulos originais foram extraídos dos manifestos do arquivo exportado. Imagens, fontes, React, ReactDOM e runtime DC foram mantidos como recursos locais. O código de lógica de cada módulo foi separado sem reescrever seu comportamento.

## Observações
- Não renomeie arquivos dentro de `assets/` sem atualizar os caminhos nos `config.json`.
- O projeto depende do runtime DC original, incluído nos recursos locais.
- A pasta `pages` mantém os módulos separados para facilitar futuras alterações sem carregar o HTML monolítico.
