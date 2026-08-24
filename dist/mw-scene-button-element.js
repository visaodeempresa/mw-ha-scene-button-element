/* mw-ha-scene-button-element — custom:mw-scene-button-element
 * O botão de CENA na planta baixa: o mesmo papel do MW Scene Button Card,
 * posicionado sobre o `picture-elements` em vez de morar numa view.
 *
 * Elemento não é card. Card entra na lista de cards; elemento entra na lista
 * `elements:` de um `type: picture-elements` e se posiciona com left/top.
 *
 * POR QUE CENA É DIFERENTE
 *   `scene.*` nunca vale "on" — o estado da cena é o carimbo de tempo da
 *   última execução. Logo o botão NASCE ACESO (cena é ação, não interruptor) e
 *   só apaga se a cena estiver indisponível/desabilitada ou se um
 *   `state_entity` explícito disser que o aparelho está desligado. O ícone é
 *   UM só, com cor de propriedade, e o toque devolve o APERTO do papel.
 *
 * GEOMETRIA proporcional: largura em % da planta e o resto em `cqmin` (por
 * cento da menor dimensão do próprio botão), então redimensionar a tela não
 * desmonta o desenho. Há reserva em px para navegador sem container queries.
 *
 * Repo: https://github.com/visaodeempresa/mw-ha-scene-button-element
 */
(() => {
  "use strict";

  const VERSION = "0.2.0";

  // >>> mw-element-identity v1 — fonte canônica: /Volumes/SSD-T1-01/CLAUDE-SSD/IA/lib/mw-element-identity/mw-element-identity.js
  // Identidade dos elementos MW na lista do editor do picture-elements.
  // Detalhes e justificativa: IA/knowledge/ha-picture-elements-editor.md.
  const MW_ID_PREFIX = "ui.panel.lovelace.editor.card.picture-elements.element_types.";
  const MW_ID_ROW = "hui-picture-elements-card-row-editor";

  // registro no padrão do window.customCards, só que para elementos
  const MW_WIN = (() => {
    const w = typeof window !== "undefined" ? window : globalThis;
    if (!w.mwPictureElements) w.mwPictureElements = [];
    if (!w.__mwElementIdentity) w.__mwElementIdentity = { wrap: null };
    return w;
  })();

  const mwEntry = (type) =>
    MW_WIN.mwPictureElements.find((e) => e && e.type === type) || null;

  // Linha 1 — embrulha o localize do hass para responder à chave do nosso tipo.
  // Só intercepta chaves do prefixo acima; qualquer outra vai inteira ao HA.
  const mwElementIdentity = (hass) => {
    try {
      const st = MW_WIN.__mwElementIdentity;
      if (!hass || typeof hass.localize !== "function") return;
      if (hass.localize === st.wrap) return;          // já é o nosso
      const orig = hass.localize;
      const wrap = function (key) {
        if (typeof key === "string" && key.indexOf(MW_ID_PREFIX) === 0) {
          const hit = mwEntry(key.slice(MW_ID_PREFIX.length));
          if (hit && hit.name) return hit.name;
        }
        return orig.apply(this, arguments);
      };
      hass.localize = wrap;
      if (hass.localize !== wrap) return;             // objeto congelado
      st.wrap = wrap;
      mwRefreshRows();
    } catch (e) { /* editor bonito não vale um erro em tela */ }
  };

  // Linha 2 — o `title` da config já resolve nativamente; isto só acrescenta
  // uma reserva boa (nome amigável da entidade) quando não há título.
  // Se o HA renomear o método interno, sai de cena sem barulho.
  let mwSecondaryAsked = false;
  const mwPatchSecondary = () => {
    try {
      if (mwSecondaryAsked) return;
      if (typeof customElements === "undefined") return;
      if (typeof customElements.whenDefined !== "function") return;
      mwSecondaryAsked = true;
      customElements.whenDefined(MW_ID_ROW).then(() => {
        const cls = customElements.get(MW_ID_ROW);
        const proto = cls && cls.prototype;
        if (!proto || proto.__mwSecondary) return;
        const orig = proto._getSecondaryDescription;
        if (typeof orig !== "function") return;
        proto._getSecondaryDescription = function (element) {
          try {
            const el = element || {};
            const hit = mwEntry(el.type);
            if (hit) {
              if (el.title) return el.title;
              const st = el.entity && this.hass && this.hass.states[el.entity];
              return (st && st.attributes && st.attributes.friendly_name)
                || el.entity || hit.description || hit.name || "";
            }
          } catch (e) { /* cai no original */ }
          return orig.apply(this, arguments);
        };
        proto.__mwSecondary = true;
      }).catch(() => {});
    } catch (e) { /* idem */ }
  };

  // A lista já desenhada não sabe que ganhou nome — pede redesenho. Só custa
  // varredura quando o editor do picture-elements chegou a ser carregado.
  const mwRefreshRows = () => {
    try {
      if (typeof customElements === "undefined" || !customElements.get(MW_ID_ROW)) return;
      if (typeof document === "undefined" || !document.body) return;
      setTimeout(() => {
        const seen = new Set();
        const walk = (root, depth) => {
          if (!root || depth > 14) return;
          let nodes;
          try { nodes = root.querySelectorAll("*"); } catch (e) { return; }
          for (const n of nodes) {
            if (n.localName === MW_ID_ROW && typeof n.requestUpdate === "function") {
              n.requestUpdate();
            }
            const sr = n.shadowRoot;
            if (sr && !seen.has(sr)) { seen.add(sr); walk(sr, depth + 1); }
          }
        };
        try { walk(document.body, 0); } catch (e) { /* nada */ }
      }, 0);
    } catch (e) { /* nada */ }
  };

  const mwRegisterElement = (entry) => {
    if (!entry || !entry.type) return;
    const list = MW_WIN.mwPictureElements;
    const i = list.findIndex((e) => e && e.type === entry.type);
    if (i < 0) list.push(entry); else list[i] = entry;
    mwPatchSecondary();
    // o hass já existe quando o recurso do dashboard carrega; pegar agora faz
    // a primeira abertura do editor já sair com o nome certo
    try {
      const root = document.querySelector && document.querySelector("home-assistant");
      if (root && root.hass) mwElementIdentity(root.hass);
    } catch (e) { /* nada */ }
  };

  // Campo do editor: é o `title` que o HA lê na segunda linha da lista.
  const MW_TITLE_LABEL = "Título (lista do editor)";
  const MW_TITLE_FIELD = { name: "title", selector: { text: {} } };
  // <<< mw-element-identity v1

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // número vira px; string com unidade ("2em", "40%") passa direto; vazio = automático
  const px = (v) => {
    if (v === "" || v === null || v === undefined) return "";
    const s = String(v).trim();
    return /^-?\d+(\.\d+)?$/.test(s) ? `${s}px` : s;
  };

  // >>> paper-palette v1 — fonte canônica: /Volumes/SSD-T1-01/CLAUDE-SSD/IA/lib/paper-palette/paper-palette.js
  // 49 papéis encardidos: 7 matizes do arco-íris × 7 tons (1 = quase branco,
  // 7 = mais encardido). Saturação baixa de propósito — papel descansa a vista.
  const PAPER_HUES = [
    ["red", "Vermelho", 6], ["orange", "Laranja", 27], ["yellow", "Amarelo", 47],
    ["green", "Verde", 96], ["blue", "Azul", 203], ["indigo", "Anil", 236],
    ["violet", "Violeta", 283],
  ];
  const PAPER_TONES = [[97, 6], [96, 9], [94, 12], [92, 15], [90, 18], [88, 21], [85, 24]];
  const PAPER_DEFAULT = "linear-gradient(145deg, #fdfaf3, #e8e3d8)";
  const paperGradient = (key) => {
    const m = /^([a-z]+)-([1-7])$/.exec(String(key || "").trim());
    if (!m) return PAPER_DEFAULT;
    const hue = PAPER_HUES.find((h) => h[0] === m[1]);
    if (!hue) return PAPER_DEFAULT;
    const [l, s] = PAPER_TONES[+m[2] - 1];
    return `linear-gradient(145deg, hsl(${hue[2]}, ${s}%, ${l}%), hsl(${hue[2]}, ${s + 4}%, ${l - 7}%))`;
  };
  const paperOptions = () => [{ value: "paper", label: "Papel original (creme)" }].concat(
    ...PAPER_HUES.map((h) => PAPER_TONES.map((t, i) => ({
      value: `${h[0]}-${i + 1}`,
      label: `${h[1]} · tom ${i + 1}${i === 0 ? " (mais claro)" : i === 6 ? " (mais encardido)" : ""}`,
    }))));
  // <<< paper-palette v1

  // >>> paper-dark-palette v1 — fonte canônica: /Volumes/SSD-T1-01/CLAUDE-SSD/IA/lib/paper-dark-palette/paper-dark-palette.js
  // 49 papéis de noite: as mesmas 7 matizes do paper-palette v1 × 7 tons
  // (1 = papel escuro mais claro, 7 = mais encardido). A saturação sobe mais
  // rápido que na rampa clara porque matiz em luminosidade baixa desaparece.
  const PAPER_DARK_HUES = [
    ["red", "Vermelho", 6], ["orange", "Laranja", 27], ["yellow", "Amarelo", 47],
    ["green", "Verde", 96], ["blue", "Azul", 203], ["indigo", "Anil", 236],
    ["violet", "Violeta", 283],
  ];
  const PAPER_DARK_TONES = [[26, 10], [24, 13], [21, 16], [19, 19], [16, 22], [14, 25], [11, 28]];
  const PAPER_DARK_DEFAULT = "linear-gradient(145deg, #2b2825, #161411)";
  const paperDarkGradient = (key) => {
    const m = /^([a-z]+)-([1-7])$/.exec(String(key || "").trim());
    if (!m) return PAPER_DARK_DEFAULT;
    const hue = PAPER_DARK_HUES.find((h) => h[0] === m[1]);
    if (!hue) return PAPER_DARK_DEFAULT;
    const [l, s] = PAPER_DARK_TONES[+m[2] - 1];
    return `linear-gradient(145deg, hsl(${hue[2]}, ${s}%, ${l}%), hsl(${hue[2]}, ${s + 6}%, ${Math.max(4, l - 6)}%))`;
  };
  const paperDarkOptions = () => [{ value: "paper", label: "Papel de noite (grafite)" }].concat(
    ...PAPER_DARK_HUES.map((h) => PAPER_DARK_TONES.map((t, i) => ({
      value: `${h[0]}-${i + 1}`,
      label: `${h[1]} · tom ${i + 1}${i === 0 ? " (mais claro)" : i === 6 ? " (mais escuro)" : ""}`,
    }))));
  // Tinta que se lê sobre o papel do modo pedido. Não é contraste calculado:
  // é o par fixo que a casa usa, para dois cards lado a lado combinarem.
  const paperInk = (dark) => (dark
    ? { text: "rgba(247, 244, 236, 0.94)", dim: "rgba(247, 244, 236, 0.62)", line: "rgba(255, 255, 255, 0.14)" }
    : { text: "rgba(28, 25, 20, 0.92)", dim: "rgba(28, 25, 20, 0.58)", line: "rgba(0, 0, 0, 0.14)" });
  // <<< paper-dark-palette v1

  // >>> touch-feedback v2 — fonte canônica: /Volumes/SSD-T1-01/CLAUDE-SSD/IA/lib/touch-feedback/touch-feedback-v2.js
  // feedback táctil: o app companion (iOS/Android) escuta o evento "haptic" na
  // window e chama o motor de vibração nativo — é assim que o próprio frontend
  // do HA vibra. Fora do app não existe essa ponte, então cai no
  // navigator.vibrate (funciona no Chrome do Android; o Safari do iPhone não
  // vibra em página nenhuma, só dentro do companion).
  const VIBRATE_MS = { selection: 5, light: 10, success: 15, medium: 20, warning: 25, heavy: 30, failure: 40 };
  const inCompanionApp = () =>
    !!(window.externalApp || window.webkit?.messageHandlers?.externalBus);
  const haptic = (kind) => {
    try {
      window.dispatchEvent(new CustomEvent("haptic",
        { bubbles: true, composed: true, detail: kind }));
      // sem a ponte do companion o evento morre sem ninguém escutando
      if (!inCompanionApp() && navigator.vibrate) navigator.vibrate(VIBRATE_MS[kind] ?? 10);
    } catch (_) { /* vibração é enfeite: nunca pode derrubar o toque */ }
  };

  // confirmação da ação (desligada por default). Duas decisões deliberadas:
  // 1) o diálogo é montado no document.body, não no shadow root do card —
  //    dentro dele o overflow:hidden do botão cortaria o modal;
  // 2) não usa window.confirm: o WebView do companion pode engolir o diálogo
  //    nativo e devolver false sozinho, e aí a ação nunca aconteceria.
  // O texto aceita {nome} e {acao} → "Tem certeza que quer desligar MESA?".
  // O card hospedeiro oferece as chaves confirm/confirm_text; o texto de
  // reserva mora aqui para o bloco não depender do DEFAULTS de ninguém.
  const CONFIRM_FALLBACK = "Tem certeza que quer {acao} {nome}?";
  const CONFIRM_PAPER = "linear-gradient(145deg, #fdfaf3, #e8e3d8)";
  // tinta de reserva: o mesmo par de paperInk(), repetido aqui para o bloco
  // continuar colável em card que não embute a paleta escura.
  const CONFIRM_INK = (dark) => (dark
    ? { text: "rgba(247, 244, 236, 0.94)", dim: "rgba(247, 244, 236, 0.62)", line: "rgba(255, 255, 255, 0.14)" }
    : { text: "rgba(28, 25, 20, 0.92)", dim: "rgba(28, 25, 20, 0.58)", line: "rgba(0, 0, 0, 0.14)" });

  // O relevo do papel é o MESMO vocabulário dos botões MW, e por isso a
  // hierarquia sai de graça: "Confirmar" é papel saliente (o botão ligado) e
  // "Cancelar" é papel afundado (o botão desligado). Ninguém precisa de cor de
  // alerta para saber qual é qual.
  const paper3dSkin = (bg, dark) => {
    // no papel escuro o brilho interno de cima tem que cair muito: 0.80 de
    // branco sobre grafite vira risco de giz, não luz.
    const lit = dark ? "rgba(255,255,255,0.10)" : "rgba(255,250,235,0.80)";
    const litSoft = dark ? "rgba(255,255,255,0.07)" : "rgba(255,250,235,0.85)";
    const dent = dark ? "rgba(0,0,0,0.50)" : "rgba(0,0,0,0.08)";
    const edge = dark ? "rgba(255,255,255,0.10)" : "rgba(180,180,180,0.55)";
    const drop = dark ? "rgba(0,0,0,0.70)" : "rgba(0,0,0,0.50)";
    // botão e balão são o MESMO papel, e só o relevo não basta para separá-los
    // — nos tons encardidos (claros ou escuros) o botão sumia dentro do balão.
    // Uma camada de tinta por cima da folha resolve sem inventar segunda cor:
    // o saliente clareia, o afundado escurece, os dois na mesma matéria.
    const tint = (v) => `linear-gradient(${v}, ${v}), ${bg}`;
    const upBg = tint(dark ? "rgba(255,255,255,0.075)" : "rgba(255,255,255,0.34)");
    const downBg = tint(dark ? "rgba(0,0,0,0.30)" : "rgba(0,0,0,0.055)");
    return {
      box: `background:${bg};border:1px solid ${edge};
        box-shadow:0 18px 50px ${drop}, 0 0 8px 2px rgba(0,0,0,0.28),
          inset 2px 2px 4px ${lit}, inset -2px -2px 4px ${dent};`,
      // saliente: luz em cima à esquerda, sombra projetada embaixo
      up: `background:${upBg};border:1px solid ${edge};
        box-shadow:inset 1px 1px 2px ${litSoft}, inset -1px -1px 2px ${dent},
          0 3px 6px rgba(0,0,0,${dark ? "0.45" : "0.22"});`,
      // afundado: a sombra vai para dentro — mesmo estado "desligado" do card
      down: `background:${downBg};border:1px solid ${edge};
        box-shadow:inset 2px 2px 5px rgba(0,0,0,${dark ? "0.55" : "0.30"}),
          inset -1px -1px 3px ${dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.45)"};`,
    };
  };

  const confirmAction = (tpl, nome, acao, opts) => new Promise((resolve) => {
    const o = opts || {};
    const msg = String(tpl || CONFIRM_FALLBACK)
      .replace(/\{nome\}/g, nome).replace(/\{acao\}/g, acao);
    const dark = o.dark === true;
    const ink = o.ink || CONFIRM_INK(dark);
    const bg = o.bg || CONFIRM_PAPER;
    const three = o.paper3d === true;
    const skin = three ? paper3dSkin(bg, dark) : null;

    // v1 chapado × v2 em relevo: as duas peles saem daqui, e o resto do
    // diálogo (foco, Esc, clique no fundo) é idêntico nos dois casos.
    const boxCss = three ? skin.box
      : `background:${CONFIRM_PAPER};box-shadow:0 10px 40px rgba(0,0,0,0.45), inset 2px 2px 4px rgba(255,250,235,0.80);`;
    const textCol = three ? ink.text : "#1a1a1a";
    const noCss = three ? skin.down + `color:${ink.text};`
      : "background:rgba(0,0,0,0.06);color:#1a1a1a;border:1px solid rgba(0,0,0,0.18);";
    const yesCss = three ? skin.up + `color:${ink.text};`
      : "background:#1a1a1a;color:#fdfaf3;border:1px solid #1a1a1a;";
    // o toque tem que responder na hora: pressionar afunda o saliente e
    // levanta o afundado, os dois trocando de lugar como papel de verdade.
    const pressCss = three
      ? `.bt button:active{${skin.down}transform:translateY(1px);}
         .bt button.no:active{${skin.up}transform:translateY(1px);}`
      : ".bt button:active{transform:translateY(1px);}";

    const host = document.createElement("div");
    host.attachShadow({ mode: "open" });
    host.shadowRoot.innerHTML = `
      <style>
        .ov{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;
          background:rgba(0,0,0,${three && dark ? "0.68" : "0.55"});padding:16px;}
        .box{max-width:min(420px,86vw);border-radius:14px;padding:22px 22px 16px;
          color:${textCol};font-family:inherit;font-size:15px;line-height:1.45;text-align:center;
          ${boxCss}}
        .bt{display:flex;gap:10px;margin-top:20px;}
        button{flex:1;padding:11px 14px;border-radius:${three ? "12px" : "10px"};font:inherit;font-size:14px;
          font-weight:600;cursor:pointer;-webkit-tap-highlight-color:transparent;
          transition:box-shadow .15s ease,transform .1s ease;}
        .no{${noCss}}
        .yes{${yesCss}}
        ${pressCss}
      </style>
      <div class="ov"><div class="box"><div class="msg"></div>
        <div class="bt"><button class="no">Cancelar</button><button class="yes">Confirmar</button></div>
      </div></div>`;
    // textContent, não innerHTML: o texto vem do YAML do dono, mas nome de
    // entidade não tem por que virar HTML.
    host.shadowRoot.querySelector(".msg").textContent = msg;
    const close = (ok) => {
      window.removeEventListener("keydown", onKey, true);
      host.remove();
      resolve(ok);
    };
    const onKey = (ev) => {
      if (ev.key === "Escape") { ev.stopPropagation(); close(false); }
      else if (ev.key === "Enter") { ev.stopPropagation(); close(true); }
    };
    host.shadowRoot.querySelector(".yes").addEventListener("click", () => close(true));
    host.shadowRoot.querySelector(".no").addEventListener("click", () => close(false));
    // clique no fundo = cancelar (mesma saída do Esc)
    host.shadowRoot.querySelector(".ov").addEventListener("click", (ev) => {
      if (ev.target === ev.currentTarget) close(false);
    });
    window.addEventListener("keydown", onKey, true);
    document.body.appendChild(host);
    host.shadowRoot.querySelector(".yes").focus();
  });
  // <<< touch-feedback v2

  // >>> mw-scene-picker v1 — fonte canônica: /Volumes/SSD-T1-01/CLAUDE-SSD/IA/lib/mw-scene-picker/mw-scene-picker.js
  // Cenas do editor agrupadas por área, na ordem da casa.
  // Detalhes e justificativa: IA/lib/mw-scene-picker/README.md.
  const MW_AREA_ORDER = ["🟨", "🟧", "⬛", "🟦", "🟩", "🟪", "⬜", "🟫", "🟥", "🏠", "🗄"];
  const MW_NO_AREA = "· sem área";
  // U+FE0F (seletor de variação) fora: "⬛️" e "⬛" têm que casar
  const mwPlain = (s) => String(s == null ? "" : s).replace(/\uFE0F/g, "").trim();
  const mwCmp = (a, b) => String(a).localeCompare(String(b), "pt-BR", { sensitivity: "base" });
  const mwAreaRank = (name) => {
    const n = mwPlain(name);
    const i = MW_AREA_ORDER.findIndex((e) => n.startsWith(e));
    return i < 0 ? MW_AREA_ORDER.length : i;
  };
  const mwSpEsc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const mwSceneName = (hass, id) => {
    const st = hass && hass.states && hass.states[id];
    const fn = st && st.attributes && st.attributes.friendly_name;
    return fn || String(id || "").replace(/^scene\./, "").replace(/_/g, " ");
  };

  const mwSceneAreaId = (hass, id) => {
    const e = hass.entities && hass.entities[id];
    if (!e) return "";
    if (e.area_id) return e.area_id;
    const d = e.device_id && hass.devices && hass.devices[e.device_id];
    return (d && d.area_id) || "";
  };

  const mwSceneGroups = (hass, filtro) => {
    if (!hass || !hass.states) return [];
    const f = mwPlain(filtro).toLowerCase();
    const porArea = new Map();
    for (const id of Object.keys(hass.states)) {
      if (id.indexOf("scene.") !== 0) continue;
      const name = mwSceneName(hass, id);
      if (f && (name + " " + id).toLowerCase().indexOf(f) < 0) continue;
      const aid = mwSceneAreaId(hass, id);
      if (!porArea.has(aid)) porArea.set(aid, []);
      porArea.get(aid).push({ id, name });
    }
    const out = [];
    porArea.forEach((scenes, aid) => {
      const area = (aid && hass.areas && hass.areas[aid] && hass.areas[aid].name) || MW_NO_AREA;
      scenes.sort((a, b) => mwCmp(a.name, b.name) || mwCmp(a.id, b.id));
      // sem área é sempre o último bloco, depois até das áreas sem emoji
      out.push({ area_id: aid, area, rank: aid ? mwAreaRank(area) : 99, scenes });
    });
    out.sort((a, b) => a.rank - b.rank || mwCmp(a.area, b.area));
    return out;
  };

  // registros iguais = nada a repintar. A contagem de states entra porque
  // cena nova aparece em `states` antes de mexer em qualquer registro.
  const mwSameRegistry = (a, b) => !!a && !!b
    && a.entities === b.entities && a.devices === b.devices && a.areas === b.areas
    && Object.keys(a.states || {}).length === Object.keys(b.states || {}).length;

  const mwSceneOptions = (groups, value, hass) => {
    let html = '<option value="">— escolha a cena —</option>';
    let achou = false;
    for (const g of groups) {
      html += `<optgroup label="${mwSpEsc(g.area)}">`;
      for (const s of g.scenes) {
        if (s.id === value) achou = true;
        html += `<option value="${mwSpEsc(s.id)}"${s.id === value ? " selected" : ""}>${mwSpEsc(s.name)}</option>`;
      }
      html += "</optgroup>";
    }
    // a cena escolhida pode estar fora da lista (filtro digitado, cena que
    // sumiu do HA): sem esta linha o `<select>` mostraria outra coisa e o
    // dono acharia que a config mudou sozinha
    if (value && !achou) {
      html = `<option value="${mwSpEsc(value)}" selected>${mwSpEsc(mwSceneName(hass, value))} (fora do filtro)</option>` + html;
    }
    return html;
  };

  const mwScenePicker = (onPick) => {
    const el = document.createElement("div");
    el.innerHTML = `
      <style>
        .mw-sp{display:block;margin:4px 0 8px;}
        .mw-sp .lbl{display:block;font-size:12px;opacity:.75;margin-bottom:4px;}
        .mw-sp .row{display:grid;grid-template-columns:1fr 1.4fr;gap:8px;align-items:center;}
        .mw-sp input,.mw-sp select{width:100%;box-sizing:border-box;padding:8px;border-radius:8px;
          border:1px solid var(--divider-color,#444);background:var(--card-background-color,inherit);
          color:var(--primary-text-color,inherit);font:inherit;font-size:13px;}
        .mw-sp .id{font-size:11px;opacity:.6;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      </style>
      <div class="mw-sp">
        <span class="lbl">Cena (área · nome)</span>
        <div class="row">
          <input class="f" type="search" placeholder="filtrar cena ou área…" autocomplete="off">
          <select class="s"></select>
        </div>
        <div class="id"></div>
      </div>`;
    const fEl = el.querySelector(".f");
    const sEl = el.querySelector(".s");
    const idEl = el.querySelector(".id");
    let hass = null, value = "", sig = null;

    const pintar = (forcar) => {
      const groups = mwSceneGroups(hass, fEl.value);
      const nova = groups.map((g) => g.area + ">" + g.scenes.map((s) => s.id).join(",")).join("|") + "#" + value;
      if (!forcar && nova === sig) return;
      // menu aberto na mão do dono: repintar agora fecharia o campo
      if (!forcar && el.getRootNode && el.getRootNode().activeElement === sEl) return;
      sig = nova;
      sEl.innerHTML = mwSceneOptions(groups, value, hass);
      sEl.value = value;
      idEl.textContent = value || "—";
    };

    fEl.addEventListener("input", () => pintar(true));
    sEl.addEventListener("change", () => {
      value = sEl.value;
      idEl.textContent = value || "—";
      if (typeof onPick === "function") onPick(value);
    });

    return {
      el,
      setHass(novo) {
        const antes = hass;
        hass = novo;
        if (mwSameRegistry(antes, novo)) return;
        pintar(false);
      },
      setValue(v) {
        const s = String(v == null ? "" : v);
        if (s === value) return;
        value = s;
        pintar(true);
      },
      refresh() { pintar(true); },
    };
  };
  // <<< mw-scene-picker v1

  const DEFAULTS = {
    // --- entidade ---
    entity: "",                // a cena (scene.*)
    name: "",                  // rótulo desenhado no botão; vazio = friendly_name
    title: "",                 // rótulo na lista do editor; não aparece na planta
    state_entity: "",          // quem dá o estado ao botão (a tomada, a luz…)
    state_on: "on",
    transition: null,          // segundos de transição da cena

    // --- geometria (% acompanha a planta ao redimensionar) ---
    left: "",
    top: "",
    width: "9%",
    height: "",                // vazio = quadrado (aspect-ratio 1/1)
    rotate: null,
    scale: null,
    border_radius: "12%",
    opacity: 1,

    // --- conteúdo ---
    icon: "mdi:play",
    icon_off: "",
    icon_unavailable: "mdi:cancel",
    hide_label: false,
    name_position: "bottom",
    icon_size: 52,             // cqmin — por cento da menor dimensão do botão
    name_size: 15,             // cqmin
    name_gap: 0,               // cqmin

    // --- comportamento ---
    control: true,
    flash: true,
    haptic: true,
    animate: false,
    icon_shadow: true,
    confirm: false,
    confirm_text: "Tem certeza que quer {acao} {nome}?",
    confirm_3d: false,
    confirm_paper_dark: false,
    confirm_paper_color: "paper",

    // --- cores ---
    paper_color: "paper",
    color_on_name: "#1a1a1a",
    color_off_name: "rgba(255, 255, 255, 0.78)",
    color_off_bg: "rgba(0, 0, 0, 0.45)",
    color_on_border: "rgba(180, 180, 180, 0.55)",
    color_off_border: "rgba(255, 255, 255, 0.08)",
    color_unavail: "#f5c518",
    color_icon: "",
    color_icon_off: "",
  };

  const LAYOUT = {
    bottom: { grid: "grid-template-areas:'i' 'n';grid-template-columns:1fr;grid-template-rows:1fr min-content;", edge: "padding-bottom:6cqmin;" },
    top: { grid: "grid-template-areas:'n' 'i';grid-template-columns:1fr;grid-template-rows:min-content 1fr;", edge: "padding-top:6cqmin;" },
    left: { grid: "grid-template-areas:'n i';grid-template-columns:min-content 1fr;grid-template-rows:1fr;", edge: "padding-left:6cqmin;" },
    right: { grid: "grid-template-areas:'i n';grid-template-columns:1fr min-content;grid-template-rows:1fr;", edge: "padding-right:6cqmin;" },
  };

  const FLASH_MS = 320;
  const num = (v, alt) => (v === "" || v === null || v === undefined || isNaN(Number(v)) ? alt : Number(v));

  class MwSceneButtonElement extends HTMLElement {
    static getStubConfig() { return { type: "custom:mw-scene-button-element", entity: "" }; }
    static getConfigElement() { return document.createElement("mw-scene-button-element-editor"); }

    setConfig(config) {
      if (!config || !config.entity) {
        throw new Error("mw-scene-button-element: escolha a cena no campo 'entity'");
      }
      if (String(config.entity).indexOf("scene.") !== 0) {
        throw new Error("mw-scene-button-element: 'entity' tem que ser uma cena (scene.*)");
      }
      this._cfg = { ...DEFAULTS, ...config };
      this._key = null;
      this._applyGeometry();
      if (this._hass) this._render();
    }

    set hass(hass) {
      mwElementIdentity(hass);
      this._hass = hass;
      if (!this._cfg) return;
      const c = this._cfg;
      // caminho rápido: o HA empurra `hass` a cada mudança de QUALQUER
      // entidade. Cena não tem estado útil, então só o state_entity conta.
      const sc = hass.states[c.entity];
      const viva = !!sc && sc.state !== "unavailable" && sc.state !== "unknown";
      const st = c.state_entity ? hass.states[c.state_entity] : null;
      // o carimbo de tempo da cena NÃO entra na chave de propósito: ativar a
      // cena mudaria o state e o redesenho comeria o aperto do papel
      const key = `${viva ? 1 : 0}|${st ? st.state : "·"}`;
      if (key === this._key) return;
      this._key = key;
      this._render();
    }

    get hass() { return this._hass; }

    getCardSize() { return 1; }

    connectedCallback() { if (this._cfg && this._hass) this._render(); }

    disconnectedCallback() { clearTimeout(this._flashTimer); }

    _applyGeometry() {
      const c = this._cfg;
      const set = (p, v) => {
        if (v === "" || v === null || v === undefined) return;
        this.style.setProperty(p, String(v));
      };
      this.style.position = "absolute";
      set("left", c.left);
      set("top", c.top);
      set("width", c.width);
      if (c.height) set("height", c.height); else this.style.aspectRatio = "1 / 1";
      set("opacity", c.opacity);
      const hasR = c.rotate !== null && c.rotate !== "";
      const hasS = c.scale !== null && c.scale !== "";
      // translate(-50%,-50%) é o que centra o botão no ponto (left, top)
      const r = hasR ? ` rotate(${c.rotate}deg)` : "";
      const s = hasS ? ` scale(${c.scale})` : "";
      this.style.transform = `translate(-50%, -50%)${r}${s}`;
    }

    _render() {
      const c = this._cfg;
      const sc = this._hass.states[c.entity];
      // cena desabilitada some do `states`; cena que existe pode estar
      // indisponível. Fora esses dois casos, botão de cena é sempre papel.
      const dead = !sc || sc.state === "unavailable" || sc.state === "unknown";
      const stEnt = c.state_entity ? this._hass.states[c.state_entity] : null;
      // POR QUE O PADRÃO É ACESO: cena não é interruptor — é ação. Não existe
      // "cena desligada", então nascer afundado era mentira de estado. Só quem
      // pede explicitamente um `state_entity` vê o botão apagar.
      const isOn = dead ? false
        : c.state_entity ? (!!stEnt && String(stEnt.state) === String(c.state_on))
        : true;

      const bg = isOn ? paperGradient(c.paper_color) : c.color_off_bg;
      const border = isOn ? c.color_on_border : c.color_off_border;
      const shadow = isOn
        ? "0 0 8px 2px rgba(0,0,0,0.28), 0 4px 10px rgba(0,0,0,0.14), inset 2px 2px 4px rgba(255,250,235,0.80), inset -2px -2px 4px rgba(0,0,0,0.08)"
        : "inset 2px 2px 5px rgba(0,0,0,0.35), inset -1px -1px 3px rgba(255,255,255,0.04)";

      const icon = dead ? c.icon_unavailable
        : (!isOn && c.icon_off) ? c.icon_off
        : (c.icon || sc?.attributes?.icon || "mdi:play");

      const nameColor = dead ? c.color_unavail : isOn ? c.color_on_name : c.color_off_name;
      const iconColor = dead ? c.color_unavail
        : isOn ? (c.color_icon || c.color_on_name)
        : (c.color_icon_off || "rgba(255,255,255,0.70)");
      const iconFilter = isOn && c.icon_shadow !== false
        ? "drop-shadow(1px 2px 2px rgba(0,0,0,0.55)) drop-shadow(3px 6px 8px rgba(0,0,0,0.30))"
        : "none";
      const spin = c.animate && isOn ? "animation:mwsbe-spin 1.2s linear infinite;" : "";

      const bare = c.hide_label === true;
      const layout = bare
        ? { grid: "grid-template-areas:'i';grid-template-columns:1fr;grid-template-rows:1fr;", edge: "" }
        : LAYOUT[c.name_position] || LAYOUT.bottom;
      const isz = num(c.icon_size, DEFAULTS.icon_size);
      const nsz = num(c.name_size, DEFAULTS.name_size);
      const gap = num(c.name_gap, 0);

      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      // container-type:size é o que dá sentido ao cqmin; a linha em px antes de
      // cada cqmin é a reserva para quem não tem container queries.
      this.shadowRoot.innerHTML = `
        <style>
          @keyframes mwsbe-spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
          .bt{container-type:size;box-sizing:border-box;width:100%;height:100%;
            border-radius:${c.border_radius};background:${bg};border:1px solid ${border};
            box-shadow:${shadow};color:${nameColor};overflow:hidden;
            cursor:${c.control === false ? "default" : "pointer"};
            -webkit-tap-highlight-color:transparent;touch-action:manipulation;user-select:none;
            transition:background .2s ease,box-shadow .2s ease,transform .12s ease,filter .12s ease;}
          .ct{display:grid;width:100%;height:100%;text-align:center;align-items:center;
            padding:6cqmin 0;box-sizing:border-box;${layout.grid}${gap ? `gap:${gap}cqmin;` : ""}}
          .ic{grid-area:i;display:flex;align-items:center;justify-content:center;
            width:100%;height:100%;overflow:hidden;
            ${c.control === false ? "opacity:.6;" : ""}}
          .ic ha-icon{--mdc-icon-size:26px;--mdc-icon-size:${isz}cqmin;
            width:${isz}cqmin;height:${isz}cqmin;
            color:${iconColor};filter:${iconFilter};${spin}
            transform-origin:center center;backface-visibility:hidden;}
          .nm{grid-area:n;max-width:100%;font-weight:600;line-height:1.1;
            font-size:9px;font-size:${nsz}cqmin;${layout.edge}color:${nameColor};
            text-decoration:${dead ? "line-through" : "none"};
            overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        </style>
        <div class="bt">
          <div class="ct">
            <div class="ic"><ha-icon icon="${esc(icon)}"></ha-icon></div>
            ${bare ? "" : `<div class="nm">${esc(c.name || (sc?.attributes?.friendly_name ?? c.entity))}</div>`}
          </div>
        </div>`;

      // segunda linha da lista do editor: o `title` que o dono escreveu
      const t = c.title || c.name || sc?.attributes?.friendly_name || c.entity;
      if (this.title !== t) this.title = t;

      this._wire(c, sc, dead);
    }

    // ponteiro puro (sem `click`): misturar os dois faz o toque "às vezes não
    // responder" quando há hold na mesma árvore
    _wire(c, sc, dead) {
      const buzz = c.haptic !== false;
      const info = c.state_entity || c.entity;
      const bt = this.shadowRoot.querySelector(".bt");
      let holdTimer = null, held = false;
      bt.addEventListener("pointerdown", () => {
        held = false;
        if (buzz) haptic("light");
        holdTimer = setTimeout(() => {
          held = true; holdTimer = null;
          if (buzz) haptic("medium");
          this.dispatchEvent(new CustomEvent("hass-more-info",
            { bubbles: true, composed: true, detail: { entityId: info } }));
        }, 500);
      });
      ["pointerleave", "pointercancel"].forEach((t) =>
        bt.addEventListener(t, () => { if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; } }));
      bt.addEventListener("pointerup", async () => {
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
        if (held || dead || c.control === false) return;
        if (c.confirm === true) {
          const nome = c.name || sc?.attributes?.friendly_name || c.entity;
          const cdark = c.confirm_paper_dark === true;
          const ok = await confirmAction(c.confirm_text, nome, "ativar", {
            paper3d: c.confirm_3d === true,
            dark: cdark,
            bg: cdark ? paperDarkGradient(c.confirm_paper_color) : paperGradient(c.confirm_paper_color),
            ink: paperInk(cdark),
          });
          if (!ok) return;
        }
        const data = { entity_id: c.entity };
        if (c.transition !== null && c.transition !== "" && c.transition !== undefined) {
          data.transition = Number(c.transition);
        }
        this._hass.callService("scene", "turn_on", data);
        if (buzz) haptic("success");
        this._pulse();
      });
    }

    // O papel já está aceso — o retorno do toque não pode ser "acender". É o
    // APERTO: a folha afunda um tico e clareia, e volta. Mexe só no estilo
    // inline, sem redesenhar, senão o próximo `hass` apagaria o efeito.
    _pulse() {
      if (this._cfg.flash === false) return;
      const el = this.shadowRoot && this.shadowRoot.querySelector(".bt");
      if (!el) return;
      clearTimeout(this._flashTimer);
      el.style.filter = "brightness(1.22)";
      el.style.transform = "scale(0.955)";
      this._flashTimer = setTimeout(() => {
        el.style.filter = "";
        el.style.transform = "";
      }, FLASH_MS);
    }
  }

  /* ---------------- EDITOR VISUAL ---------------- */

  const LABELS = {
    name: "Nome no botão",
    title: MW_TITLE_LABEL,
    icon: "Ícone",
    icon_off: "Ícone quando o estado está desligado (vazio = o mesmo)",
    icon_unavailable: "Ícone (cena não existe)",
    state_entity: "Entidade de estado (opcional — acende o papel)",
    state_on: "Valor que conta como ligado",
    transition: "Transição da cena (segundos; vazio = padrão)",
    left: "Posição — esquerda (ex.: 42%)",
    top: "Posição — topo (ex.: 30%)",
    width: "Largura (ex.: 9%)",
    height: "Altura (vazio = quadrado)",
    rotate: "Girar (graus)",
    scale: "Escala",
    border_radius: "Arredondamento",
    opacity: "Opacidade",
    hide_label: "Esconder o label (só o ícone)",
    name_position: "Posição do label",
    icon_size: "Tamanho do ícone (% do botão)",
    name_size: "Tamanho do texto (% do botão)",
    name_gap: "Distância entre label e ícone (% do botão)",
    control: "Permitir ativar no toque",
    flash: "Aperto do papel ao ativar a cena",
    haptic: "Vibrar ao tocar",
    animate: "Animar ícone quando ligado (girar)",
    icon_shadow: "Sombra no ícone quando ligado",
    confirm: "Pedir confirmação antes de ativar",
    confirm_text: "Mensagem da confirmação ({nome} e {acao} são substituídos)",
    confirm_3d: "Balão 3D (a confirmação em papel com relevo)",
    confirm_paper_dark: "Balão em papel escuro",
    confirm_paper_color: "Cor do papel do balão",
    paper_color: "Cor do papel",
    color_on_name: "Texto",
    color_off_name: "Desligado: texto (só com entidade de estado)",
    color_off_bg: "Desligado: fundo",
    color_on_border: "Ligado: borda",
    color_off_border: "Desligado: borda",
    color_unavail: "Cena inexistente: destaque",
    color_icon: "Ícone (vazio = a cor do texto)",
    color_icon_off: "Desligado: ícone",
  };

  const COLOR_FIELDS = ["color_icon", "color_icon_off", "color_on_name", "color_off_name",
    "color_off_bg", "color_on_border", "color_off_border", "color_unavail"];

  const parseColor = (str) => {
    const s = String(str || "").trim();
    let m = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
    if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
    m = s.match(/^#([0-9a-f]{6})$/i);
    if (m) { const n = parseInt(m[1], 16); return { r: n >> 16, g: (n >> 8) & 255, b: n & 255, a: 1 }; }
    m = s.match(/^#([0-9a-f]{3})$/i);
    if (m) { const [r, g, b] = m[1].split("").map((x) => parseInt(x + x, 16)); return { r, g, b, a: 1 }; }
    return { r: 128, g: 128, b: 128, a: 1 };
  };
  const toHex = ({ r, g, b }) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  const toRgba = ({ r, g, b, a }) => `rgba(${r}, ${g}, ${b}, ${a})`;

  const SCHEMA = (cfg) => [
    { name: "name", selector: { text: {} } },
    MW_TITLE_FIELD,
    { name: "icon", selector: { icon: {} } },
    { name: "state_entity", selector: { entity: {} } },
    ...(cfg?.state_entity ? [
      { name: "state_on", selector: { text: {} } },
      { name: "icon_off", selector: { icon: {} } },
    ] : []),
    { type: "grid", name: "", schema: [
      { name: "left", selector: { text: {} } },
      { name: "top", selector: { text: {} } },
      { name: "width", selector: { text: {} } },
      { name: "height", selector: { text: {} } },
    ] },
    { type: "expandable", name: "", title: "Aparência", schema: [
      { name: "hide_label", selector: { boolean: {} } },
      ...(cfg?.hide_label === true ? [] : [
        { name: "name_position", selector: { select: { mode: "dropdown", options: [
          { value: "bottom", label: "Abaixo do ícone" },
          { value: "top", label: "Acima do ícone" },
          { value: "left", label: "À esquerda do ícone" },
          { value: "right", label: "À direita do ícone" },
        ] } } },
        { name: "name_size", selector: { number: { min: 4, max: 40, step: 1, mode: "box", unit_of_measurement: "%" } } },
        { name: "name_gap", selector: { number: { min: 0, max: 30, step: 1, mode: "box", unit_of_measurement: "%" } } },
      ]),
      { name: "icon_size", selector: { number: { min: 10, max: 100, step: 1, mode: "box", unit_of_measurement: "%" } } },
      { name: "paper_color", selector: { select: { mode: "dropdown", options: paperOptions() } } },
      { name: "border_radius", selector: { text: {} } },
      { name: "opacity", selector: { number: { min: 0, max: 1, step: 0.05, mode: "box" } } },
      { name: "rotate", selector: { number: { min: -180, max: 180, step: 1, mode: "box", unit_of_measurement: "°" } } },
      { name: "scale", selector: { number: { min: 0.1, max: 5, step: 0.05, mode: "box" } } },
      { name: "icon_shadow", selector: { boolean: {} } },
      { name: "animate", selector: { boolean: {} } },
      { name: "icon_unavailable", selector: { icon: {} } },
    ] },
    { type: "expandable", name: "", title: "Toque", schema: [
      { name: "control", selector: { boolean: {} } },
      { name: "flash", selector: { boolean: {} } },
      { name: "haptic", selector: { boolean: {} } },
      { name: "transition", selector: { number: { min: 0, max: 300, step: 0.5, mode: "box", unit_of_measurement: "s" } } },
      { name: "confirm", selector: { boolean: {} } },
      ...(cfg?.confirm === true ? [
        { name: "confirm_text", selector: { text: {} } },
        { name: "confirm_3d", selector: { boolean: {} } },
        ...(cfg?.confirm_3d === true ? [
          { name: "confirm_paper_dark", selector: { boolean: {} } },
          { name: "confirm_paper_color", selector: { select: { mode: "dropdown",
            options: cfg?.confirm_paper_dark === true ? paperDarkOptions() : paperOptions() } } },
        ] : []),
      ] : []),
    ] },
  ];

  class MwSceneButtonElementEditor extends HTMLElement {
    setConfig(config) { this._config = { ...(config || {}) }; this._renderAll(); }

    set hass(hass) {
      this._hass = hass;
      if (this._form) this._form.hass = hass;
      if (this._picker) this._picker.setHass(hass);
    }

    _renderAll() { this._renderPicker(); this._renderForm(); this._renderColors(); }

    _renderPicker() {
      if (!this._picker) {
        this._picker = mwScenePicker((id) => {
          this._config = { ...this._config, entity: id };
          this._emit();
          this._renderForm();
        });
        this.appendChild(this._picker.el);
        if (this._hass) this._picker.setHass(this._hass);
      }
      this._picker.setValue(this._config?.entity || "");
    }

    _renderForm() {
      if (!this._form) {
        this._form = document.createElement("ha-form");
        this._form.computeLabel = (f) => LABELS[f.name] || f.name;
        this._form.addEventListener("value-changed", (ev) => this._onChange(ev));
        this.appendChild(this._form);
      }
      this._form.hass = this._hass;
      this._form.schema = SCHEMA(this._config);
      const data = { ...DEFAULTS, ...this._config };
      for (const k of Object.keys(data)) {
        if (data[k] === "" || data[k] === null) delete data[k];
      }
      this._form.data = data;
    }

    _renderColors() {
      if (!this._colorsEl) {
        this._colorsEl = document.createElement("details");
        this._colorsEl.style.cssText = "margin-top:16px;border:1px solid var(--divider-color);border-radius:8px;padding:8px 12px;";
        this.appendChild(this._colorsEl);
      }
      const rows = COLOR_FIELDS.map((name) => {
        const cur = this._config[name] ?? DEFAULTS[name] ?? "";
        const c = parseColor(cur || "rgba(128,128,128,1)");
        return `<div class="mwsbe-crow" data-name="${name}">
          <span class="lbl">${LABELS[name] || name}</span>
          <input type="color" value="${toHex(c)}" title="cor">
          <input type="range" min="0" max="1" step="0.01" value="${c.a}" title="transparência (alfa)">
          <code>${cur || "—"}</code>
        </div>`;
      }).join("");
      this._colorsEl.innerHTML = `
        <summary style="cursor:pointer;font-weight:500;">Cores (clique para ajustar — cor + transparência)</summary>
        <style>
          .mwsbe-crow{display:grid;grid-template-columns:1fr 44px 110px minmax(120px,1fr);gap:10px;align-items:center;padding:6px 0;}
          .mwsbe-crow .lbl{font-size:13px;}
          .mwsbe-crow input[type=color]{width:40px;height:28px;border:none;background:none;cursor:pointer;padding:0;}
          .mwsbe-crow code{font-size:11px;opacity:.7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        </style>${rows}`;
      this._colorsEl.querySelectorAll(".mwsbe-crow").forEach((rowEl) => {
        const name = rowEl.dataset.name;
        const apply = () => {
          const hex = rowEl.querySelector("input[type=color]").value;
          const a = parseFloat(rowEl.querySelector("input[type=range]").value);
          const { r, g, b } = parseColor(hex);
          const value = a >= 1 ? hex : toRgba({ r, g, b, a });
          const clean = { ...this._config };
          if (value === DEFAULTS[name]) delete clean[name]; else clean[name] = value;
          rowEl.querySelector("code").textContent = clean[name] || "—";
          this._config = clean;
          this._emit();
        };
        rowEl.querySelector("input[type=color]").addEventListener("input", apply);
        rowEl.querySelector("input[type=range]").addEventListener("input", apply);
      });
    }

    _emit() {
      this.dispatchEvent(new CustomEvent("config-changed",
        { bubbles: true, composed: true, detail: { config: this._config } }));
    }

    _onChange(ev) {
      ev.stopPropagation();
      const v = { ...ev.detail.value };
      // `type` e `entity` não passam pelo ha-form: sem copiá-los à mão o
      // primeiro toque no formulário apagaria os dois do YAML
      const clean = { type: this._config.type || "custom:mw-scene-button-element",
                      entity: this._config.entity };
      for (const [k, val] of Object.entries(v)) {
        if (val === undefined || val === null || val === "") continue;
        if (val !== DEFAULTS[k]) clean[k] = val;
      }
      for (const k of COLOR_FIELDS) {
        if (this._config[k] !== undefined) clean[k] = this._config[k];
      }
      this._config = clean;
      this._emit();
      this._renderForm();
      this._renderColors();
    }
  }

  mwRegisterElement({
    type: "custom:mw-scene-button-element",
    name: "Cena",
    description: "MW · botão de cena na planta",
  });

  if (!customElements.get("mw-scene-button-element")) {
    customElements.define("mw-scene-button-element", MwSceneButtonElement);
    customElements.define("mw-scene-button-element-editor", MwSceneButtonElementEditor);
  }

  console.info(`%c MW-SCENE-BUTTON-ELEMENT %c ${VERSION} `, "background:#1a1a1a;color:#fdfaf3;font-weight:700;", "background:#e8e3d8;color:#1a1a1a;font-weight:700;");
})();
