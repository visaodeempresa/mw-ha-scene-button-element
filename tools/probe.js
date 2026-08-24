/* Probe headless GENÉRICO — instancia o componente fora do navegador com um
 * shim mínimo de DOM. Não conhece as regras deste card/elemento: só garante
 * que o arquivo carrega, registra o custom element, aceita uma config mínima
 * e oferece editor. É o piso, não o teto — assim que houver comportamento que
 * dói perder (cor por estado, geometria, otimismo do toque), acrescente
 * verificações específicas aqui. Ver IA/lib/mw-devops/README.md.
 *
 * Roda no CI e antes de qualquer PR:  node tools/probe.js
 *
 * GERADO por IA/tools/mw-devops.sh na primeira aplicação; a partir daí é
 * SEU — o script nunca sobrescreve um probe existente.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const mkStyle = () => {
  const s = { _p: {} };
  s.setProperty = (k, v) => { s._p[k] = v; s[k] = v; };
  s.removeProperty = (k) => { delete s._p[k]; delete s[k]; };
  return s;
};

class Node {
  constructor(tag) {
    this.tagName = String(tag || "div").toUpperCase();
    this.style = mkStyle();
    this.children = [];
    this.dataset = {};
    this._attrs = {};
    this._listeners = {};
  }
  appendChild(n) { this.children.push(n); return n; }
  append(...n) { n.forEach((x) => this.children.push(x)); }
  removeChild(n) { this.children = this.children.filter((c) => c !== n); }
  setAttribute(k, v) { this._attrs[k] = String(v); }
  getAttribute(k) { return k in this._attrs ? this._attrs[k] : null; }
  removeAttribute(k) { delete this._attrs[k]; }
  addEventListener(t, f) { (this._listeners[t] = this._listeners[t] || []).push(f); }
  removeEventListener() {}
  dispatchEvent() { return true; }
  emit(t, ev) { (this._listeners[t] || []).forEach((f) => f(ev)); }
  querySelector() { return new Node("div"); }
  querySelectorAll() { return []; }
  getBoundingClientRect() { return { width: 100, height: 100, top: 0, left: 0 }; }
  attachInternals() { return {}; }
}

global.Node = Node;
global.HTMLElement = class extends Node {
  attachShadow() {
    this.shadowRoot = new Node("shadow-root");
    this.shadowRoot.adoptedStyleSheets = [];
    this.shadowRoot.innerHTML = "";
    return this.shadowRoot;
  }
};
const reg = {};
global.customElements = {
  define: (n, c) => { reg[n] = c; },
  get: (n) => reg[n],
  whenDefined: () => Promise.resolve(),
};
global.document = {
  createElement: (t) => new Node(t),
  createElementNS: (_ns, t) => new Node(t),
  head: new Node("head"),
  body: new Node("body"),
};
global.window = { customElements: global.customElements, matchMedia: () => ({ matches: false, addListener() {}, addEventListener() {} }) };
global.CustomEvent = class { constructor(t, d) { this.type = t; Object.assign(this, d); } };
global.Event = global.CustomEvent;
global.CSSStyleSheet = class { replaceSync(css) { this.css = css; } };
global.requestAnimationFrame = (f) => setTimeout(f, 0);
global.cancelAnimationFrame = clearTimeout;
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
console.info = () => {};

const root = path.join(__dirname, "..");
const asset = require(path.join(root, "hacs.json")).filename;
const src = fs.readFileSync(path.join(root, "dist", asset), "utf8");

let fails = 0;
const check = (label, cond, extra = "") => {
  if (cond) { console.log(`  ok   ${label}`); return true; }
  fails += 1;
  console.log(`  FAIL ${label}${extra ? " — " + extra : ""}`);
  return false;
};

console.log(`carga (${asset}):`);
let loaded = true;
try { eval(src); } catch (e) { loaded = false; console.log(`  FAIL o arquivo não carrega — ${e.message}`); fails += 1; }

if (loaded) {
  const names = Object.keys(reg);
  check("registra pelo menos um custom element", names.length > 0, names.join(", "));

  const main = names.filter((n) => !n.endsWith("-editor"))[0];
  const editor = names.filter((n) => n.endsWith("-editor"))[0];

  if (main) {
    console.log(`componente (${main}):`);
    let inst = null;
    try { inst = new reg[main](); } catch (e) { check("instancia", false, e.message); }
    if (inst) {
      check("instancia sem explodir", true);
      check("tem setConfig", typeof inst.setConfig === "function");
      check("recusa config vazia", (() => {
        try { inst.setConfig({}); return false; } catch (_) { return true; }
      })(), "setConfig({}) deveria lançar");
      check("oferece editor visual",
        typeof reg[main].getConfigElement === "function",
        "static getConfigElement() ausente");
    }
  }

  if (editor) {
    console.log(`editor (${editor}):`);
    try {
      const ed = new reg[editor]();
      check("editor instancia sem explodir", true);
      check("editor tem setConfig", typeof ed.setConfig === "function");
    } catch (e) { check("editor instancia", false, e.message); }
  } else {
    check("registra um *-editor", false, "sem editor o card não é configurável pela tela");
  }
}

console.log("versão:");
check("banner/const de versão presente",
  /(%c\s*v?\d+\.\d+\.\d+|VERSION\s*=\s*["']\d+\.\d+\.\d+["'])/.test(src),
  "o auto-release precisa achar a versão para sincronizar");

/* ---- verificações próprias deste componente ---- */

// o bloco mw-scene-picker é reavaliado sozinho para poder ser testado sem DOM
const pickerSrc = (() => {
  const L = src.split("\n");
  const i = L.findIndex((l) => l.includes(">>> mw-scene-picker v1"));
  const j = L.findIndex((l) => l.includes("<<< mw-scene-picker v1"));
  return i < 0 || j < 0 ? null : L.slice(i, j + 1).join("\n");
})();

console.log("lista de cenas (área + nome):");
if (!check("bloco mw-scene-picker v1 embutido", !!pickerSrc)) {
  // sem o bloco não há o que testar
} else {
  const grupos = new Function(pickerSrc + "\nreturn { mwSceneGroups, mwAreaRank };")();
  const hass = {
    areas: {
      a1: { name: "🟩 BANHEIRO SOCIAL" }, a2: { name: "🟨 COZINHA" },
      a3: { name: "ORGANIZAR" }, a4: { name: "🟥🚪 HALL" }, a5: { name: "⬛️ ESCRITÓRIO" },
    },
    devices: { d1: { area_id: "a3" } },
    entities: {
      "scene.b": { area_id: "a2" }, "scene.a": { area_id: "a2" },
      "scene.c": { area_id: "a1" }, "scene.d": { device_id: "d1" },
      "scene.e": { area_id: "a4" }, "scene.f": { area_id: "a5" },
      "scene.g": {},
    },
    states: {
      "scene.a": { attributes: { friendly_name: "Zebra" } },
      "scene.b": { attributes: { friendly_name: "Abacaxi" } },
      "scene.c": { attributes: {} }, "scene.d": { attributes: {} },
      "scene.e": { attributes: {} }, "scene.f": { attributes: {} },
      "scene.g": { attributes: {} },
      "light.nao_conta": { attributes: {} },
    },
  };
  const g = grupos.mwSceneGroups(hass);
  const nomes = g.map((x) => x.area);
  check("áreas na ordem da casa (emoji primeiro, na ordem pedida)",
    nomes.join(" | ") === "🟨 COZINHA | ⬛️ ESCRITÓRIO | 🟩 BANHEIRO SOCIAL | 🟥🚪 HALL | ORGANIZAR | · sem área",
    nomes.join(" | "));
  check("cenas em ordem alfabética dentro da área",
    g[0].scenes.map((s) => s.name).join(",") === "Abacaxi,Zebra",
    g[0].scenes.map((s) => s.name).join(","));
  check("cena sem área da entidade herda a do dispositivo",
    g.find((x) => x.area === "ORGANIZAR")?.scenes[0]?.id === "scene.d");
  check("só entra scene.* na lista",
    g.every((x) => x.scenes.every((s) => s.id.startsWith("scene."))));
  check("filtro por texto encurta a lista",
    grupos.mwSceneGroups(hass, "abacax").reduce((n, x) => n + x.scenes.length, 0) === 1);
  check("⬛️ com e sem seletor de variação (U+FE0F) casam",
    grupos.mwAreaRank("⬛ SEM FE0F") === grupos.mwAreaRank("⬛️ COM FE0F"));
}

console.log("cena é obrigatório:");
const mainName = Object.keys(reg).filter((n) => !n.endsWith("-editor"))[0];
if (mainName) {
  const inst2 = new reg[mainName]();
  check("recusa entidade que não é cena", (() => {
    try { inst2.setConfig({ entity: "light.mesa" }); return false; } catch (_) { return true; }
  })());
  check("aceita uma cena", (() => {
    try { inst2.setConfig({ entity: "scene.ar_escritorio" }); return true; } catch (e) { return false; }
  })());
}

console.log("identidade no editor do picture-elements:");
const regEls = (global.window.mwPictureElements || []);
check("mwRegisterElement chamado",
  regEls.some((e) => e.type === "custom:mw-scene-button-element"),
  JSON.stringify(regEls));
check("nome curto em pt-BR na lista",
  (regEls.find((e) => e.type === "custom:mw-scene-button-element") || {}).name === "Cena");
check("campo `title` no formulário do editor",
  /MW_TITLE_FIELD/.test(src), "sem ele a segunda linha da lista fica 'Unknown type'");

console.log("desenho:");
if (mainName) {
  const PAPEL = "linear-gradient(145deg, #fdfaf3";
  const fakeHass = {
    states: {
      "scene.ar": { state: "2026-08-24T10:00:00+00:00", attributes: { friendly_name: "AR ESCRITÓRIO" } },
      "scene.morta": { state: "unavailable", attributes: {} },
      "switch.tomada": { state: "off", attributes: {} },
    },
    callService: () => {},
  };
  const desenha = (cfg) => {
    const el = new reg[mainName]();
    el.setConfig(cfg);
    el.hass = fakeHass;
    return String((el.shadowRoot && el.shadowRoot.innerHTML) || "");
  };

  const html = desenha({ entity: "scene.ar", name: "CLIMAT", icon: "mdi:play", color_icon: "green" });
  check("desenha sem explodir", html.length > 0);
  check("o ícone configurado é o que vai para a tela", html.includes('icon="mdi:play"'));
  check("o rótulo é o `name`", html.includes("CLIMAT"));
  // a regra do dono: cena é ação, não interruptor — nasce de papel aceso
  check("cena sozinha JÁ NASCE de papel aceso", html.includes(PAPEL));
  check("a cor do ícone vale no papel", html.includes("color:green"));

  const off = desenha({ entity: "scene.ar", icon: "mdi:play", state_entity: "switch.tomada",
                        icon_off: "mdi:fan", color_icon_off: "red" });
  check("com state_entity DESLIGADO o papel apaga", !off.includes(PAPEL));
  check("com state_entity desligado vale o icon_off", off.includes('icon="mdi:fan"'));
  check("com state_entity desligado vale o color_icon_off", off.includes("color:red"));

  const morta = desenha({ entity: "scene.morta", icon_unavailable: "mdi:cancel" });
  check("cena indisponível cai no ícone de indisponível", morta.includes('icon="mdi:cancel"'));
  check("cena indisponível não fica de papel", !morta.includes(PAPEL));

  const sumida = desenha({ entity: "scene.sumiu", icon_unavailable: "mdi:cancel" });
  check("cena desabilitada (fora do states) idem", sumida.includes('icon="mdi:cancel"'));
}

console.log(fails ? `\n${fails} verificação(ões) falharam` : "\ntudo ok");
process.exit(fails ? 1 : 0);
