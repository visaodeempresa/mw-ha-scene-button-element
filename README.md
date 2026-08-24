<!-- MW-BRAND:BEGIN — gerado por IA/tools/mw-brand.sh · não editar à mão -->
<p align="center">
  <a href="https://github.com/visaodeempresa">
    <img src="https://mayconsoftware.github.io/assets/ve/LOGO_VISAO_DE_EMPRESA_HEIGHT-64px.png" alt="Visão de Empresa — MAYCON WILLIAN OLIVEIRA" height="64">
  </a>
  <br>
  <sub><b>Visão de Empresa</b> · componente de Home Assistant por MAYCON WILLIAN OLIVEIRA</sub>
</p>
<!-- MW-BRAND:END -->

# MW Scene Button Element

`custom:mw-scene-button-element` — o **botão de cena na planta baixa**: o mesmo
papel do [MW Scene Button Card](https://github.com/visaodeempresa/mw-ha-scene-button-card),
posicionado sobre um `picture-elements`.

```yaml
type: picture-elements
image: /local/planta.png
elements:
  - type: custom:mw-scene-button-element
    entity: scene.ligar_climatizador_escritorio
    title: Climatizador do escritório
    name: CLIMAT
    icon: mdi:play
    color_icon: green
    state_entity: switch.tomada_climatizador_do_escritorio_socket_1
    left: 42%
    top: 61%
    width: 9%
```

Elemento **não** é card: card entra na lista de cards de uma view, elemento
entra no `elements:` e se posiciona com `left`/`top`.

## Por que cena é diferente

`scene.*` nunca vale `on` — o estado da cena é o carimbo de tempo da última
execução. Então: **um** ícone (sempre visível), cor do ícone apagado
configurável, `state_entity` opcional para acender o papel, e um **pulso de
papel** ao tocar, que é o único retorno que uma cena dá.

## A lista de cenas

Mesma lista do card: `<select>` com **área no cabeçalho e cena identada
embaixo**, filtro ao lado, áreas na ordem da casa
(🟨 🟧 ⬛️ 🟦 🟩 🟪 ⬜️ 🟫 🟥 🏠 🗄️ e depois as demais em ordem alfabética),
cenas em ordem alfabética dentro de cada área.

## Geometria

Proporcional de propósito: `width` em **% da planta**, e o miolo (ícone, texto,
folga) em **% do próprio botão** (`cqmin`), então redimensionar a tela não
desmonta o desenho.

| chave | padrão | o que faz |
|---|---|---|
| `left` / `top` | — | o ponto onde o **centro** do botão fica |
| `width` | `9%` | largura, em % da planta |
| `height` | — | vazio = quadrado (`aspect-ratio: 1/1`) |
| `border_radius` | `12%` | arredondamento |
| `rotate` / `scale` / `opacity` | — | ajuste fino |
| `icon_size` / `name_size` / `name_gap` | `52` / `15` / `0` | % da menor dimensão do botão |

O resto das chaves (`entity`, `icon`, `state_entity`, `flash`, `confirm`,
cores…) é igual ao card — veja a tabela lá.

`title:` é o rótulo que aparece na **lista do editor** do `picture-elements`;
`name:` é o texto desenhado no botão.

## Instalação

HACS → Repositórios personalizados → `visaodeempresa/mw-ha-scene-button-element`,
categoria **Dashboard**.

## Verificação

```bash
node --check dist/mw-scene-button-element.js
node tools/probe.js
```

---

MIT © MAYCON WILLIAN OLIVEIRA
