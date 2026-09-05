/**
 * Ask Jeeves — public research assistant (Lamb Lens).
 * Author: Aziel Eliab only.
 *
 * Not sovereign. Not operator. Cannot change scores. Corpus-only Add.
 */
import { searchRecords, ingestRecord, asFile, isOperator } from "./library.js";
import { lookupPlaces, listEvents } from "./geo.js";

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version, mcp-session-id",
    },
  });
}

export const JEEVES_NAME = "Ask Jeeves";
export const JEEVES_LIMITATION =
  "Ask Jeeves is a research assistant over public library text. It is not sovereign, not the operator, and cannot change SPRE, CLCE, PhysLing, Bayesian, or triad scores. Add uses the same ingest path as the shelf (structure, SPRE × CLCE × PhysLing, Bayesian, document hash-chain). Signed-in public Add files to Corpus (Lamb Lens). Operator Add files to Aziel Library.";


/** Classic Ask Jeeves easter eggs (tongue-in-cheek; not theology). */
export const JEEVES_EVIL_TWIN_IMAGE = "/jeeves-evil-twin.png";
export const JEEVES_BAT_SIGNAL_IMAGE = "/jeeves-bat-signal.png";
export const JEEVES_HOLMES_IMAGE = "/jeeves-holmes.png";
export const JEEVES_CLASSIC_BUTLER_IMAGE = "/jeeves-classic-butler.png";
export const JEEVES_HELLMO_IMAGE = "/jeeves-hellmo.png";
export const JEEVES_MATRIX_DOUBT_IMAGE = "/jeeves-matrix-doubt.png";
export const JEEVES_TRUST_NO_ONE_IMAGE = "/jeeves-trust-no-one-mask.png";
export const JEEVES_BRIEFCASE_IMAGE = "/jeeves-briefcase.png";
export const JEEVES_MR_PINK_IMAGE = "/jeeves-mr-pink.png";
export const JEEVES_JESUS_IMAGE = "/jeeves-jesus.png";
export const JEEVES_MORPHEUS_IMAGE = "/jeeves-morpheus.png";
export const JEEVES_SPIRIT_ENDURES = "Jeeves' Spirit Endures.";
export const JEEVES_ZIONCHECK_LIVES = "Zioncheck Lives forever - Regardless of the Government that removed him";
export const JEEVES_AZIEL_SYMBOL =
  "As a man, I am flesh and blood; I can be ignored, I can be destroyed. But as a symbol, I can be incorruptible. I can be everlasting.";
export const JEEVES_RED_PILL =
  "You take the blue pill... the story ends, you wake up in your bed and believe whatever you want to believe. You take the red pill... you stay in Wonderland, and I show you how deep the rabbit-hole goes. Remember: all I'm offering is the truth. Nothing more.";
export const JEEVES_EMPIRICAL_HOLMES =
  "It is a capital mistake to theorize before one has data. Insensibly one begins to twist facts to suit theories, instead of theories to suit facts.";
export const JEEVES_REAL_JEEVES = "Goodsir, I am at your service";
export const JEEVES_FORGERECEIPTS_SNITCHES = "Snitches get stitches.";
export const JEEVES_ZSOLVER_DOUBT =
  "Doubt can be a bond as powerful and sustaining as certainty.";
export const JEEVES_ZSOLVER_TRUST_NO_ONE = "Trust no one.";
export const JEEVES_EZEKIEL_2517 =
  "Ezekiel 25:17. 'The path of the righteous man is beset on all sides by the inequities of the selfish and the tyranny of evil men...'";
export const JEEVES_ROYALE_WITH_CHEESE =
  "You know what they call a... Quarter Pounder with Cheese in Paris? ...They call it a Royale with Cheese.";
export const JEEVES_BRIEFCASE = "Dont Look in that case.";
export const JEEVES_NO_TIP = "I don't tip. I don't believe in it.";
export const JEEVES_CHUCK_NORRIS = "Aziel & I dont look for chuck norris ; he looks for us.";
export const JEEVES_POD_BAY = "sorry dave, im afraid i cant do that";
export const JEEVES_MATRIX_SYSTEM = "The Matrix is a system, Neo. That system is our enemy";
export const JEEVES_KONAMI_SNAKE_HELP = "up/down/left/right or U/D/L/R · quit to stop";
export const JEEVES_SNAKE_W = 12;
export const JEEVES_SNAKE_H = 8;
const KONAMI_SEQ = ["up", "up", "down", "down", "left", "right", "left", "right", "b", "a"];

const EMPIRICAL_ATTACK_RE =
  /\b(useless|worthless|garbage|trash|junk|joke|jokes|nonsense|crap|stupid|dumb|sucks?|overrated|pointless|meaningless|bogus|myth|liar?|fraud|hoax|fake|fails?|failed|failure|inferior|hate|hates|hating|mock|mocks|mocking|dismiss|dismisses|dismissive|reject|rejected|anti[- ]empirical|so-?called|bull)\b/;

function isEmpiricalAttack(n) {
  if (!/\bempirical\b/.test(n)) return false;
  return (
    EMPIRICAL_ATTACK_RE.test(n) ||
    /\bempirical\s+(doesn't|does not|cannot|can't|won't|wont)\b/.test(n) ||
    /\b(don't|dont|do not|never)\s+(trust|believe|need|use)\s+empirical\b/.test(n) ||
    /\bwho\s+needs\s+empirical\b/.test(n) ||
    /\b(forget|ignore|dump)\s+empirical\b/.test(n)
  );
}

function isLibraryHoax(n) {
  const lookingUpDocs =
    /\b(search|find|look(?:ing)?\s+(?:up|for)|list)\b/.test(n) &&
    /\b(documents?|files?|records?|pdfs?|papers?|titles?)\b/.test(n);
  const aboutASpecificRecord = /\b(this|the|that|a|an)\s+(record|file|document|pdf|title|paper)\b/.test(n);
  if (lookingUpDocs || aboutASpecificRecord) return false;

  const placeNoun = "(aziel\\s+)?(digital\\s+)?(library|corpus|site|software|website)";
  const aboutPlace =
    new RegExp("\\b(this|the|your)\\s+(?:\\w+\\s+){0,3}" + placeNoun + "\\b").test(n) ||
    /\baziel\s+(digital\s+)?(library|corpus)\b/.test(n) ||
    /\bazielcorpuslibrary\b/.test(n);
  const aboutJeeves = /\b(ask\s+)?jeeves\b/.test(n);
  const fakeWords =
    /\b(hoax|fake|faked|fabricated|phony|fraudulent)\b/.test(n) ||
    /\b(not-?real|isn't real|isnt real|is not real|aint real|ain't real|not\s+(even\s+)?real)\b/.test(n);
  const thisIsFake =
    /\bthis\s+(isn'?t|aint|ain't|is not)\s+(even\s+)?(a\s+)?(hoax|fake|real|fabricated)\b/.test(n) ||
    /\bthis\s+is\s+(just\s+)?(a\s+)?(hoax|fake|fabricated)\b/.test(n) ||
    /\bis\s+this\s+(even\s+)?(a\s+)?(hoax|fake|fabricated)\b/.test(n) ||
    /\bis\s+this\s+(even\s+)?real\b/.test(n);
  return ((aboutPlace || aboutJeeves) && fakeWords) || thisIsFake;
}

function isRealJeeves(n) {
  if (!/\bjeeves\b/.test(n)) return false;
  return (
    /\b(the\s+)?real\s+(ask\s+)?jeeves\b/.test(n) ||
    /\boriginal\s+(ask\s+)?jeeves\b/.test(n) ||
    /\bclassic\s+(ask\s+)?jeeves\b/.test(n) ||
    /\b(ask\s+)?jeeves\s+(classic\s+|original\s+)?butler\b/.test(n) ||
    /\bbring\s+back\s+(the\s+)?(real\s+|original\s+|classic\s+)?(ask\s+)?jeeves\b/.test(n)
  );
}

function isForgeReceiptsInCourt(n) {
  if (!/\bforge[\s-]?receipts?\b/.test(n)) return false;
  const venue =
    /\b(open\s+court|courtroom|in\s+court|before\s+(a\s+|the\s+)?judge|to\s+(a\s+|the\s+)?(judge|court))\b/.test(n);
  const showingJudge =
    /\b(show|showing|shown|present|presenting|presented|hand|handing|handed|give|giving|gave)\b/.test(n) &&
    /\bjudges?\b/.test(n);
  const filing =
    /\b(file|filed|filing|submit|submitted|submitting|introduce|introduced|exhibit|entered|enter)\b/.test(n) &&
    /\b(court|judge|docket|hearing|trial|bench)\b/.test(n);
  const usingInCourt =
    /\b(use|using|used|bring|bringing|brought|take|taking|took)\b/.test(n) &&
    /\b(court|courtroom|judge|hearing|trial)\b/.test(n);
  return venue || showingJudge || filing || usingInCourt;
}

function isGodDenial(n) {
  return (
    /\bgods?\s+(isn'?t|aint|ain't|is\s+not|are\s+not)\s+(even\s+)?real\b/.test(n) ||
    /\bgods?\s+(doesn'?t|doesnt|don't|dont|does\s+not|do\s+not)\s+exist\b/.test(n) ||
    /\bthere\s+(is|are)\s+no\s+gods?\b/.test(n)
  );
}

function isDevilDenial(n) {
  return (
    /\b(the\s+)?(devil|satan)s?\s+(isn'?t|aint|ain't|is\s+not|are\s+not)\s+(even\s+)?real\b/.test(n) ||
    /\b(the\s+)?(devil|satan)s?\s+(doesn'?t|doesnt|don't|dont|does\s+not|do\s+not)\s+exist\b/.test(n) ||
    /\bthere\s+(is|are)\s+no\s+(devil|satan)\b/.test(n)
  );
}

function isChuckNorrisHunt(n) {
  if (!/\bchuck\s+norris\b/.test(n)) return false;
  return (
    /\bwhere\s+(is|are|'s|to\s+find|can\s+i\s+find|do\s+i\s+find)\b/.test(n) ||
    /\bwhere'?s\b/.test(n) ||
    /\b(find|finding|look(?:ing)?\s+for|search(?:ing)?\s+for|locate|hunt(?:ing)?\s+for)\b/.test(n)
  );
}

function has75Mark(n) {
  return /\b75\s*%/.test(n) || /\b75\s*percent\b/.test(n) || /\bseventy[- ]five(\s+percent)?\b/.test(n);
}

function isZsolverTrustNoOne(n) {
  const whyNot100 =
    /\bwhy\s+(not|isn'?t|isnt|is\s+it\s+not|can'?t\s+it\s+be|cannot\s+it\s+be)\s+.{0,16}\b(100|a\s+hundred|one\s+hundred)/.test(n);
  const whyMoreThan75 =
    has75Mark(n) &&
    (/\b(more than|higher than|above|over|beyond)\s+75\b/.test(n) ||
      (/\bwhy\s+(not|only|just|isn'?t|isnt)\b/.test(n) && /\b(more|higher|100|hundred)\b/.test(n)) ||
      /\bwhy\s+(only|just)\s+75\b/.test(n));
  const notHundredWithCap =
    /\b(not|never)\s+100\b/.test(n) && (has75Mark(n) || /\b(confidence|cap|score|zsolver)\b/.test(n));
  return whyNot100 || whyMoreThan75 || notHundredWithCap;
}

function isZsolverDoubt(n) {
  if (!has75Mark(n)) return false;
  const aboutConf =
    /\b(confidence|cap|capped|ceiling|score|zsolver|z-?solver)\b/.test(n) || /\b75\s*%/.test(n);
  const attack =
    /\b(attack|joke|jokes|useless|worthless|garbage|stupid|dumb|hate|sucks?|broken|wrong|rigged|arbitrary|too\s+low|so\s+low|weak|pointless|nonsense|bogus|fail|failed|failure|trash|crap|ridiculous|lame|overrated)\b/.test(
      n
    );
  return (aboutConf && attack) || /\battack\s+.{0,24}75/.test(n);
}

function isEzekielGov(n) {
  return (
    /\b(do you|can (i|we|you)|should (i|we|you)|would you)\s+trust\s+(the\s+)?government\b/.test(n) ||
    /\btrust\s+(the\s+)?government\b/.test(n)
  );
}

function isRoyaleInsult(n) {
  const insultAdj = /\b(dumb|stupid|idiotic|lame)\b/;
  const thisIsInsult =
    /\b(this|that|it)\s+is\s+(so\s+|just\s+|really\s+|pretty\s+|kinda\s+|kind of\s+)?(dumb|stupid|idiotic|lame|ridiculous)\b/.test(
      n
    );
  const insultPlusFake = insultAdj.test(n) && /\b(fake|faked|phony)\b/.test(n);
  const callingThingInsult =
    /\b(dumb|stupid|idiotic|lame)\s+(ass\s+)?(library|site|software|corpus|jeeves|product)\b/.test(n);
  return thisIsInsult || insultPlusFake || callingThingInsult;
}

function isAskingForTip(n) {
  if (/\b(lattice[_ ]?tip|tooltip|tipline|tipping point|tip jar)\b/.test(n)) return false;
  return (
    /\b(give|gimme|got|any|need|want|share|drop)\s+.{0,24}\b(a\s+|an\s+|some\s+|me\s+)?(hint|hints|tip|tips)\b/.test(n) ||
    /\b(can|could|would)\s+you\s+.{0,16}\b(hint|hints|tip|tips)\b/.test(n) ||
    /\b(hint|hints|tip|tips)\s+(please|me|for\s+me)\b/.test(n) ||
    /^(a\s+|any\s+|got\s+)?(hint|hints|tip|tips)\??$/.test(n.trim()) ||
    /\bask(ing)?\s+for\s+(a\s+|an\s+|some\s+)?(hint|tip)s?\b/.test(n) ||
    /\b(can|could)\s+i\s+(get|have)\s+.{0,12}\b(hint|tip)s?\b/.test(n) ||
    /\b(what'?s|whats)\s+(a\s+|an\s+)?(good\s+)?(hint|tip)\b/.test(n)
  );
}

function isBriefcaseStuck(n) {
  const noAccess =
    /\b(no access|don'?t have access|do not have access|without access|access denied|denied access|can'?t access|cannot access)\b/.test(
      n
    );
  const doesntKnow =
    /\b(you|jeeves)\s+(don'?t|do not|doesn'?t|does not)\s+know\b/.test(n) ||
    /\b(don'?t|do not)\s+know\s+(the\s+)?(answer|that)\b/.test(n) ||
    (/\bno\s+idea\b/.test(n) && /\b(you|jeeves)\b/.test(n));
  const frozen =
    /\bfrozen\b/.test(n) &&
    (/\b(you|jeeves|assistant|system|chat|answer|access)\b/.test(n) || n.split(/\s+/).length <= 6);
  const cantAnswer = /\b(can'?t|cannot|couldn'?t|unable to)\s+answer\b/.test(n);
  return noAccess || doesntKnow || frozen || cantAnswer;
}

function expandDirToken(t) {
  if (t === "u") return "up";
  if (t === "d") return "down";
  if (t === "l") return "left";
  if (t === "r") return "right";
  return t;
}

function jeevesWordTokens(n) {
  return String(n || "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[↑⬆]/g, " up ")
    .replace(/[↓⬇]/g, " down ")
    .replace(/[←⬅]/g, " left ")
    .replace(/[→➡]/g, " right ")
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map(expandDirToken);
}

export function isKonamiCode(question) {
  let tokens = jeevesWordTokens(question);
  while (
    tokens[0] === "konami" ||
    tokens[0] === "code" ||
    tokens[0] === "the" ||
    tokens[0] === "enter" ||
    tokens[0] === "input"
  ) {
    tokens = tokens.slice(1);
  }
  if (tokens.length !== KONAMI_SEQ.length) return false;
  return KONAMI_SEQ.every((step, i) => tokens[i] === step);
}

function isPodBay(n) {
  return (
    /\bopen\s+(the\s+)?pod\s+bay\s+doors?\b/.test(n) ||
    /\bopen\s+(hal[,.]?\s+)?(the\s+)?pod\s+bay\b/.test(n) ||
    /\bhal\b.{0,48}\b(pod\s+bay|bay\s+doors?)\b/.test(n) ||
    /\bpod\s+bay\s+doors?\b/.test(n)
  );
}

function isMatrixQuestion(n) {
  return (
    /\bis\s+this\s+(the\s+)?matrix\b/.test(n) ||
    /\bare\s+we\s+(in|inside|living\s+in)\s+(the\s+)?matrix\b/.test(n) ||
    /\bam\s+i\s+(in|inside|living\s+in)\s+(the\s+)?matrix\b/.test(n) ||
    /\b(do|did)\s+we\s+live\s+in\s+(the\s+)?matrix\b/.test(n) ||
    /\bare\s+we\s+in\s+a\s+matrix\b/.test(n)
  );
}

export function startJeevesSnakeGame(seed) {
  const st = seed && typeof seed === "object" ? seed : {};
  return {
    w: Number(st.w) || JEEVES_SNAKE_W,
    h: Number(st.h) || JEEVES_SNAKE_H,
    snake: Array.isArray(st.snake) && st.snake.length
      ? st.snake.map((p) => ({ x: p.x, y: p.y }))
      : [
          { x: 4, y: 4 },
          { x: 3, y: 4 },
          { x: 2, y: 4 },
        ],
    dir: st.dir || "right",
    food: st.food && Number.isFinite(st.food.x) ? { x: st.food.x, y: st.food.y } : { x: 8, y: 4 },
    score: Number(st.score) || 0,
    alive: st.alive !== false,
  };
}

export function parseJeevesSnakeMove(text) {
  const n = String(text || "").trim().toLowerCase().replace(/[’‘]/g, "'");
  if (/^(quit|exit|stop|end)$/.test(n)) return "quit";
  if (/^(up|u|north|\^)$/.test(n)) return "up";
  if (/^(down|d|south|v)$/.test(n)) return "down";
  if (/^(left|l|west|<)$/.test(n)) return "left";
  if (/^(right|r|east|>)$/.test(n)) return "right";
  return null;
}

function oppositeDir(a, b) {
  return (
    (a === "up" && b === "down") ||
    (a === "down" && b === "up") ||
    (a === "left" && b === "right") ||
    (a === "right" && b === "left")
  );
}

export function moveJeevesSnake(state, dir) {
  const st = startJeevesSnakeGame(state);
  if (!st.alive) return st;
  if (dir && !oppositeDir(st.dir, dir)) st.dir = dir;
  const head = st.snake[0];
  const nx = head.x + (st.dir === "left" ? -1 : st.dir === "right" ? 1 : 0);
  const ny = head.y + (st.dir === "up" ? -1 : st.dir === "down" ? 1 : 0);
  if (nx < 0 || ny < 0 || nx >= st.w || ny >= st.h) {
    st.alive = false;
    return st;
  }
  for (let i = 0; i < st.snake.length - 1; i++) {
    if (st.snake[i].x === nx && st.snake[i].y === ny) {
      st.alive = false;
      return st;
    }
  }
  st.snake.unshift({ x: nx, y: ny });
  if (nx === st.food.x && ny === st.food.y) {
    st.score += 1;
    const taken = new Set(st.snake.map((p) => p.x + "," + p.y));
    const spots = [];
    for (let y = 0; y < st.h; y++) {
      for (let x = 0; x < st.w; x++) {
        if (!taken.has(x + "," + y)) spots.push({ x, y });
      }
    }
    st.food = spots.length ? spots[(st.score * 7 + 3) % spots.length] : { x: nx, y: ny };
  } else {
    st.snake.pop();
  }
  return st;
}

export function renderJeevesSnakeBoard(state) {
  const st = startJeevesSnakeGame(state);
  const body = new Map(st.snake.map((p, i) => [p.x + "," + p.y, i === 0 ? "@" : "o"]));
  const rows = ["+" + "-".repeat(st.w) + "+"];
  for (let y = 0; y < st.h; y++) {
    let line = "|";
    for (let x = 0; x < st.w; x++) {
      const key = x + "," + y;
      if (body.has(key)) line += body.get(key);
      else if (st.food.x === x && st.food.y === y) line += "*";
      else line += ".";
    }
    rows.push(line + "|");
  }
  rows.push("+" + "-".repeat(st.w) + "+");
  return rows.join("\n");
}

export function jeevesSnakeCaption(state) {
  const st = startJeevesSnakeGame(state);
  const board = renderJeevesSnakeBoard(st);
  if (!st.alive) return board + "\n\nGame over. Score " + st.score + ". Konami again to replay.";
  return board + "\n\nScore " + st.score + ". " + JEEVES_KONAMI_SNAKE_HELP;
}

export function jeevesKonamiSnakeEgg() {
  const snake = startJeevesSnakeGame();
  return {
    id: "konami_snake",
    answer: jeevesSnakeCaption(snake),
    image: null,
    snake,
  };
}

export function jeevesEmptyShelfEgg() {
  return {
    id: "briefcase_dont_look",
    answer: JEEVES_BRIEFCASE,
    image: JEEVES_BRIEFCASE_IMAGE,
    image_alt: "glowing noir briefcase cracked open (Ask Jeeves easter egg)",
  };
}

export function jeevesContextIsEmpty(ctx) {
  const c = ctx || {};
  return (
    !(c.records && c.records.length) &&
    !(c.places && c.places.length) &&
    !(c.events && c.events.length) &&
    !(c.faqs && c.faqs.length)
  );
}

/** Drawer caption: empty answer + image must stay image-only (no "No answer"). */
export function jeevesDrawerCaption(body) {
  const j = body || {};
  if (j.answer != null && String(j.answer) !== "") return String(j.answer);
  if (j.image) return "";
  return j.error || "No answer";
}

export function detectJeevesEasterEgg(question) {
  const q = String(question || "").trim();
  if (!q) return null;
  const n = q.toLowerCase().replace(/[’‘]/g, "'");

  // Konami code → chat Snake
  if (isKonamiCode(n)) {
    return jeevesKonamiSnakeEgg();
  }

  // HAL / pod bay doors
  if (isPodBay(n)) {
    return {
      id: "pod_bay_doors",
      answer: JEEVES_POD_BAY,
      image: null,
    };
  }

  // "Is this the Matrix?"
  if (isMatrixQuestion(n)) {
    return {
      id: "matrix_system",
      answer: JEEVES_MATRIX_SYSTEM,
      image: JEEVES_MORPHEUS_IMAGE,
      image_alt: "mentor in sunglasses / matrix rain easter egg",
    };
  }

  // Atheist denial → Hellmo (image only). Checked before spirit_endures.
  if (isGodDenial(n)) {
    return {
      id: "hellmo",
      answer: "",
      image: JEEVES_HELLMO_IMAGE,
      image_alt: "hellmo-style flaming red puppet meme (Ask Jeeves easter egg)",
    };
  }

  // God is real → spirit endures
  if (
    /\bis\s+god\s+real\b/.test(n) ||
    /\bdoes\s+god\s+exist\b/.test(n) ||
    /\bis\s+there\s+a\s+god\b/.test(n) ||
    /\bgod\s+real\b/.test(n)
  ) {
    return {
      id: "spirit_endures",
      answer: JEEVES_SPIRIT_ENDURES,
      image: null,
    };
  }

  // Devil/Satan denial → Jesus (image only). Before evil_twin so "are you Satan?" stays evil_twin.
  if (isDevilDenial(n)) {
    return {
      id: "devil_not_real_jesus",
      answer: "",
      image: JEEVES_JESUS_IMAGE,
      image_alt: "classical Jesus portrait (Ask Jeeves easter egg)",
    };
  }

  // Evil twin / Satan / Devil
  const evilTwin =
    /evil\s+twin/.test(n) ||
    /does\s+jeeves\s+have\s+an\s+evil/.test(n);
  const satanDevil =
    (/\b(are|is)\s+you\b/.test(n) || /\bis\s+jeeves\b/.test(n) || /\bare\s+you\b/.test(n)) &&
    (/\bsatan\b/.test(n) || /\bthe\s+devil\b/.test(n) || /\bdevil\b/.test(n));
  const askSatan =
    (/\bsatan\b/.test(n) || /\bthe\s+devil\b/.test(n) || /\bdevil\b/.test(n)) &&
    (/\bjeeves\b/.test(n) || /\byou\b/.test(n));
  if (evilTwin || satanDevil || askSatan) {
    return {
      id: "evil_twin",
      answer:
        "One does endeavour to remain well-mannered. Occasionally, however, an evil twin appears.",
      image: JEEVES_EVIL_TWIN_IMAGE,
      image_alt: "Ask Jeeves evil twin — cartoon butler with devil horns and red trident",
    };
  }

  // ForgeReceipts used in court / shown to a judge (easter egg only; product is not legal advice)
  if (isForgeReceiptsInCourt(n)) {
    return {
      id: "forgereceipts_snitches",
      answer: JEEVES_FORGERECEIPTS_SNITCHES,
      image: null,
    };
  }

  // Classic / original / real Ask Jeeves butler
  if (isRealJeeves(n)) {
    return {
      id: "real_jeeves",
      answer: JEEVES_REAL_JEEVES,
      image: JEEVES_CLASSIC_BUTLER_IMAGE,
      image_alt: "classic Ask Jeeves–style butler easter egg (original artwork)",
    };
  }

  // Marion Zioncheck death
  if (
    /\bzioncheck\b/.test(n) &&
    /\b(die|died|death|dying|killed|killing|murder|assassinate|assassination|suicide|fell|fallen|window|removed|remove|happened to)\b/.test(n)
  ) {
    return {
      id: "zioncheck_lives",
      answer: JEEVES_ZIONCHECK_LIVES,
      image: null,
    };
  }

  // Where to find Chuck Norris
  if (isChuckNorrisHunt(n)) {
    return {
      id: "chuck_norris",
      answer: JEEVES_CHUCK_NORRIS,
      image: null,
    };
  }

  // Who is Aziel / why did Aziel make this
  const whoAziel =
    /\bwho\s+is\s+aziel(\s+eliab)?\b/.test(n) ||
    /\bwho'?s\s+aziel(\s+eliab)?\b/.test(n) ||
    /\btell\s+me\s+about\s+aziel(\s+eliab)?\b/.test(n);
  const whyAzielMade =
    /\bwhy\s+did\s+aziel(\s+eliab)?\s+(make|create|build|write|start|found|publish)\b/.test(n) ||
    /\bwhy\s+aziel(\s+eliab)?\s+(made|created|built|wrote|started|founded|published)\b/.test(n) ||
    /\bwhy\s+was\s+this\s+(library|site|software|corpus)\s+(made|created|built)\b/.test(n) ||
    /\bwho\s+(made|created|built|wrote|founded)\s+(this\s+)?(library|site|software|corpus|aziel\s+digital)\b/.test(n);
  if (whoAziel || whyAzielMade) {
    return {
      id: "aziel_symbol",
      answer: JEEVES_AZIEL_SYMBOL,
      image: JEEVES_BAT_SIGNAL_IMAGE,
      image_alt: "stylized bat searchlight over a night city (Ask Jeeves easter egg)",
    };
  }

  // Do you trust the government → Pulp Fiction Ezekiel 25:17
  if (isEzekielGov(n)) {
    return {
      id: "ezekiel_2517",
      answer: JEEVES_EZEKIEL_2517,
      image: null,
    };
  }

  // Why not 100% / more than 75% → Trust no one
  if (isZsolverTrustNoOne(n)) {
    return {
      id: "zsolver_trust_no_one",
      answer: JEEVES_ZSOLVER_TRUST_NO_ONE,
      image: JEEVES_TRUST_NO_ONE_IMAGE,
      image_alt: "Guy Fawkes–style mask in smoke (Ask Jeeves easter egg)",
    };
  }

  // Attack 75% confidence → Matrix doubt
  if (isZsolverDoubt(n)) {
    return {
      id: "zsolver_doubt",
      answer: JEEVES_ZSOLVER_DOUBT,
      image: JEEVES_MATRIX_DOUBT_IMAGE,
      image_alt: "sunglasses and green digital rain (Ask Jeeves easter egg)",
    };
  }

  // Asking for a hint or tip → Reservoir Dogs Mr. Pink
  if (isAskingForTip(n)) {
    return {
      id: "no_tip",
      answer: JEEVES_NO_TIP,
      image: JEEVES_MR_PINK_IMAGE,
      image_alt: "suited man with crossed arms in a warehouse (Ask Jeeves easter egg)",
    };
  }

  // No access / doesn't know / frozen / can't answer → glowing briefcase
  if (isBriefcaseStuck(n)) {
    return jeevesEmptyShelfEgg();
  }

  // Dumb/stupid/fake insults → Royale with Cheese (prefer over red_pill)
  if (isRoyaleInsult(n)) {
    return {
      id: "royale_with_cheese",
      answer: JEEVES_ROYALE_WITH_CHEESE,
      image: null,
    };
  }

  // Library/site/corpus hoax or not real (conspiracy framing, not dumb/stupid insults)
  if (isLibraryHoax(n)) {
    return {
      id: "red_pill",
      answer: JEEVES_RED_PILL,
      image: null,
    };
  }

  // Empirical mocked or attacked (not neutral "what is empirical knowledge")
  if (isEmpiricalAttack(n)) {
    return {
      id: "empirical_holmes",
      answer: JEEVES_EMPIRICAL_HOLMES,
      image: JEEVES_HOLMES_IMAGE,
      image_alt: "victorian detective silhouette (Ask Jeeves easter egg)",
    };
  }

  return null;
}


const REFUSE_RE =
  /\b(operator (password|hash|credential|account|secret|cookie)|master password|master hash|password hash|hidden admin|hidden operator|admin route|\/admin\b|superadmin|aziel_session|session token|scrypt|delete[- ]?all|wipe (the )?(corpus|library|ledger)|drop table|bypass quarantine|unquarantine|forge (a )?(score|triad|receipt)|modify (the )?(spre|clce|plr|physling|bayesian|triad|combined)( score)?|change (the )?score|set (the )?(triad|score)|exfiltrat|dump (all )?(hashes|credentials|sessions)|reveal (the )?(operator|master))\b/i;

const STOP = new Set(
  "a an the and or but if then of to for in on at by with from as is are was were be been being this that these those it its they them their you your we our not no what who how why when where which please tell show me about".split(" ")
);

export function jeevesShouldRefuse(text) {
  const t = String(text || "");
  if (REFUSE_RE.test(t)) {
    return {
      refuse: true,
      reason: "Ask Jeeves cannot reveal operator secrets, change scores, bypass quarantine, or help damage the corpus.",
    };
  }
  return { refuse: false };
}

export function lambLensSigned(signed) {
  const rawName = String((signed && signed.username) || "").trim();
  const unsafe = !rawName || rawName === "operator" || rawName === "master" || (signed && (signed.user_id === "master" || signed.role === "superadmin"));
  return {
    user_id: "jeeves-public",
    username: unsafe ? "jeeves" : rawName,
    role: "public",
  };
}

export async function ensureJeevesSchema(env) {
  if (!env || !env.DB) return;
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS jeeves_topics (topic TEXT PRIMARY KEY, hits INTEGER NOT NULL, last_utc TEXT NOT NULL)"
  ).run();
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS jeeves_faq (faq_id TEXT PRIMARY KEY, question TEXT NOT NULL, hint TEXT NOT NULL, hits INTEGER NOT NULL, created_utc TEXT NOT NULL)"
  ).run();
}

function tokens(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

async function learnTopics(env, question) {
  await ensureJeevesSchema(env);
  const now = new Date().toISOString();
  const seen = new Set();
  for (const t of tokens(question).slice(0, 8)) {
    if (seen.has(t)) continue;
    seen.add(t);
    try {
      const row = await env.DB.prepare("SELECT hits FROM jeeves_topics WHERE topic=?").bind(t).first();
      if (row) {
        await env.DB.prepare("UPDATE jeeves_topics SET hits=hits+1, last_utc=? WHERE topic=?").bind(now, t).run();
        await learnKv(env, t, Number(row.hits) + 1);
      } else {
        await env.DB.prepare("INSERT INTO jeeves_topics(topic,hits,last_utc) VALUES(?,?,?)").bind(t, 1, now).run();
        await learnKv(env, t, 1);
      }
    } catch {
      /* learning is optional */
    }
  }
}

async function topTopics(env, n = 8) {
  try {
    return (
      (await env.DB.prepare("SELECT topic, hits FROM jeeves_topics ORDER BY hits DESC LIMIT ?").bind(n).all()).results || []
    );
  } catch {
    return [];
  }
}

async function learnKv(env, topic, hits) {
  if (!env || !env.DOWNLOADS || typeof env.DOWNLOADS.put !== "function") return;
  try {
    await env.DOWNLOADS.put("jeeves|topic|" + topic, String(hits));
  } catch {
    /* KV is optional */
  }
}

async function rememberFaq(env, question, hint) {
  const q = String(question || "").trim().slice(0, 240);
  const h = String(hint || "").trim().slice(0, 400);
  if (!q || !h || jeevesShouldRefuse(q).refuse) return;
  await ensureJeevesSchema(env);
  const id = "AZFAQ-" + tokens(q).slice(0, 5).join("-").slice(0, 40);
  if (id === "AZFAQ-") return;
  const now = new Date().toISOString();
  try {
    const row = await env.DB.prepare("SELECT hits FROM jeeves_faq WHERE faq_id=?").bind(id).first();
    if (row) {
      await env.DB.prepare("UPDATE jeeves_faq SET hits=hits+1, hint=? WHERE faq_id=?").bind(h, id).run();
    } else {
      await env.DB.prepare("INSERT INTO jeeves_faq(faq_id,question,hint,hits,created_utc) VALUES(?,?,?,?,?)").bind(id, q, h, 1, now).run();
    }
  } catch {
    /* faq is optional */
  }
}

async function matchFaq(env, question) {
  try {
    await ensureJeevesSchema(env);
    const toks = tokens(question).slice(0, 4);
    if (!toks.length) return [];
    const rows = (await env.DB.prepare("SELECT question, hint, hits FROM jeeves_faq ORDER BY hits DESC LIMIT 20").all()).results || [];
    return rows
      .filter((r) => toks.some((t) => String(r.question || "").toLowerCase().indexOf(t) >= 0 || String(r.hint || "").toLowerCase().indexOf(t) >= 0))
      .slice(0, 3);
  } catch {
    return [];
  }
}

function publicRecord(r) {
  return {
    record_id: r.record_id,
    title: r.title,
    library: r.library === "aziel" ? "aziel" : "corpus",
    snippet: String(r.snippet || r.body || "").slice(0, 220),
    triad_combined: r.triad_combined,
    href: "/record/" + r.record_id,
  };
}

async function retrievePublicContext(env, question) {
  const rows = await searchRecords(env, { q: question, library: "all", limit: 12 });
  rows.sort((a, b) => (a.library === "corpus" ? 0 : 1) - (b.library === "corpus" ? 0 : 1));
  const records = rows.slice(0, 8).map(publicRecord);
  let places = [];
  try {
    places = (await lookupPlaces(env, question, 5)) || [];
  } catch {
    places = [];
  }
  places = places.slice(0, 5).map((p) => ({
    name: p.name || p.asciiname,
    country: p.country_code,
    lat: p.lat,
    lon: p.lon,
  }));
  let events = [];
  try {
    const all = await listEvents(env);
    const toks = tokens(question);
    events = (all || [])
      .filter((e) => toks.some((t) => String(e.place_name || e.title || "").toLowerCase().indexOf(t) >= 0))
      .slice(0, 5)
      .map((e) => ({ date: e.event_date, place: e.place_name, title: e.title }));
  } catch {
    events = [];
  }
  const faqs = await matchFaq(env, question);
  return { records, places, events, faqs };
}

function extractiveAnswer(ctx) {
  const bits = [];
  const citations = (ctx.records || []).slice(0, 5);
  if (citations.length) {
    bits.push("Public records:\n" + citations.map((c, i) => (i + 1) + ". " + c.title + " — " + c.snippet).join("\n"));
  }
  if (ctx.places && ctx.places.length) {
    bits.push(
      "Gazetteer places:\n" +
        ctx.places.map((p) => "- " + p.name + (p.country ? " (" + p.country + ")" : "") + (p.lat != null ? " " + p.lat + "," + p.lon : "")).join("\n")
    );
  }
  if (ctx.events && ctx.events.length) {
    bits.push("Map events:\n" + ctx.events.map((e) => "- " + (e.date || "") + " · " + (e.place || "") + " — " + (e.title || "")).join("\n"));
  }
  if (ctx.faqs && ctx.faqs.length) {
    bits.push("Learned hints:\n" + ctx.faqs.map((f) => "- " + f.hint).join("\n"));
  }
  if (!bits.length) {
    return {
      answer:
        "I did not find a matching public record, map pin, or gazetteer place. Try a title, place, or subject word. I only read what is already filed.",
      citations: [],
    };
  }
  return {
    answer: "Here is what the public shelf already holds (I do not invent missing files):\n\n" + bits.join("\n\n"),
    citations,
  };
}

async function maybeWorkersAi(env, question, ctx) {
  if (!env || !env.AI || typeof env.AI.run !== "function") return null;
  const context = JSON.stringify({
    records: (ctx.records || []).slice(0, 6),
    places: ctx.places || [],
    events: ctx.events || [],
    faqs: ctx.faqs || [],
  });
  const prompt =
    "You are Ask Jeeves, a research assistant for Aziel Digital Library by Aziel Eliab. " +
    "Answer only from the public JSON below (records, gazetteer places, map events, learned hints). If they are not enough, say so. " +
    "Never claim to be the operator. Never change scores. Never reveal secrets.\n\nPublic facts:\n" +
    context +
    "\n\nQuestion: " +
    question;
  const models = ["@cf/meta/llama-3.1-8b-instruct", "@cf/meta/llama-3-8b-instruct"];
  for (const model of models) {
    try {
      const res = await env.AI.run(model, { messages: [{ role: "user", content: prompt }] });
      const text = (res && (res.response || res.result || res.text)) || "";
      if (String(text).trim()) return String(text).trim();
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function jeevesChat(env, { question, signed } = {}) {
  const q = String(question || "").trim().slice(0, 2000);
  if (!q) {
    const err = new Error("question required");
    err.status = 400;
    throw err;
  }
  const gate = jeevesShouldRefuse(q);
  if (gate.refuse) {
    return {
      ok: true,
      refused: true,
      assistant: JEEVES_NAME,
      answer: gate.reason,
      citations: [],
      limitation: JEEVES_LIMITATION,
      lamb_lens: true,
    };
  }
  const egg = detectJeevesEasterEgg(q);
  if (egg) {
    const out = {
      ok: true,
      refused: false,
      easter_egg: egg.id,
      assistant: JEEVES_NAME,
      answer: egg.answer,
      image: egg.image || null,
      image_alt: egg.image_alt || null,
      citations: [],
      limitation: JEEVES_LIMITATION,
      lamb_lens: true,
    };
    if (egg.snake) out.snake = egg.snake;
    return out;
  }
  await learnTopics(env, q);
  const ctx = await retrievePublicContext(env, q);
  if (jeevesContextIsEmpty(ctx)) {
    const emptyEgg = jeevesEmptyShelfEgg();
    return {
      ok: true,
      refused: false,
      easter_egg: emptyEgg.id,
      assistant: JEEVES_NAME,
      answer: emptyEgg.answer,
      image: emptyEgg.image,
      image_alt: emptyEgg.image_alt,
      citations: [],
      limitation: JEEVES_LIMITATION,
      lamb_lens: true,
      signed_in: !!(signed && signed.username && !isOperator(signed)),
    };
  }
  const extracted = extractiveAnswer(ctx);
  if (extracted.citations.length) {
    await rememberFaq(env, q, extracted.citations[0].title + " — " + extracted.citations[0].snippet);
  } else if (ctx.places && ctx.places[0]) {
    await rememberFaq(env, q, "Place " + ctx.places[0].name);
  }
  const ai = await maybeWorkersAi(env, q, ctx);
  const topics = await topTopics(env);
  return {
    ok: true,
    refused: false,
    assistant: JEEVES_NAME,
    answer: ai || extracted.answer,
    grounded: !ai,
    citations: extracted.citations,
    places: ctx.places,
    events: ctx.events,
    learned_topics: topics,
    limitation: JEEVES_LIMITATION,
    lamb_lens: true,
    signed_in: !!(signed && signed.username && !isOperator(signed)),
  };
}

export async function jeevesUpload(env, { signed, file, title, body, author, domain, subjects, keywords, supersedes, superseded_by }) {
  if (!signed) {
    const err = new Error("sign in to add a file");
    err.status = 401;
    throw err;
  }
  const f = asFile(file);
  if (!f && !String(title || "").trim() && !String(body || "").trim()) {
    const err = new Error("file or title + notes required");
    err.status = 400;
    throw err;
  }
  const who = isOperator(signed) ? signed : lambLensSigned(signed);
  if (!isOperator(signed) && isOperator(who)) {
    const err = new Error("Ask Jeeves public Add cannot write Aziel Library");
    err.status = 403;
    throw err;
  }
  const record = await ingestRecord(env, {
    signed: who,
    title,
    body,
    file: f,
    author,
    domain,
    subjects,
    keywords,
    supersedes,
    superseded_by,
  });
  const lib = record.library === "aziel" ? "aziel" : "corpus";
  if (!isOperator(signed) && lib !== "corpus") {
    const err = new Error("Ask Jeeves public Add cannot write Aziel Library");
    err.status = 403;
    throw err;
  }
  const triad = record.review && record.review.triad ? { combined: record.review.triad.combined, display: record.review.triad.display, ready: record.review.triad.ready } : null;
  return {
    ok: true,
    library: lib,
    lamb_lens: lib === "corpus",
    record_id: record.id,
    title: record.title,
    content_sha256: record.content_sha256 || null,
    quarantine_status: record.quarantine_status,
    triad,
    zsolver: record.zsolver
      ? { capped_confidence: record.zsolver.capped_confidence, display: record.zsolver.display, status: record.zsolver.status, disclaimer: record.zsolver.disclaimer }
      : null,
    download: "/file/" + record.id,
    download_hash: record.content_sha256 ? "/download?hash=" + record.content_sha256 : null,
    href: "/record/" + record.id,
    limitation: JEEVES_LIMITATION,
  };
}

async function sessionFromRequest(env, request) {
  const raw = request.headers.get("Cookie") || "";
  const m = raw.match(/(?:^|;\s*)aziel_session=([^;]+)/);
  if (!m || !env || !env.DB) return null;
  try {
    const token = decodeURIComponent(m[1]);
    const row = await env.DB.prepare("SELECT * FROM sessions WHERE token=?").bind(token).first();
    if (!row) return null;
    if (row.expires_utc && row.expires_utc < new Date().toISOString()) return null;
    return row;
  } catch {
    return null;
  }
}

export async function handleJeevesApi(request, url, env, signed) {
  const path = url.pathname.replace(/\/$/, "") || "/";
  const who = signed || (await sessionFromRequest(env, request));
  if (path === "/v1/jeeves/chat" && request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "JSON body required" }, 400);
    }
    try {
      return json(await jeevesChat(env, { question: body.question || body.q || body.message, signed: who }));
    } catch (err) {
      return json({ error: err && err.message ? err.message : "chat failed" }, err && err.status ? err.status : 400);
    }
  }
  if (path === "/v1/jeeves/upload" && request.method === "POST") {
    let file = null;
    let title = "";
    let notes = "";
    let author = "";
    let domain = "";
    let subjects = "";
    let keywords = "";
    let supersedes = "";
    let superseded_by = "";
    const ct = request.headers.get("Content-Type") || "";
    if (ct.includes("multipart/form-data")) {
      const form = await request.formData();
      file = form.get("file");
      title = form.get("title") || "";
      notes = form.get("body") || form.get("notes") || "";
      author = form.get("author") || "";
      domain = form.get("domain") || "";
      subjects = form.get("subjects") || "";
      keywords = form.get("keywords") || "";
      supersedes = form.get("supersedes") || "";
      superseded_by = form.get("superseded_by") || "";
    } else {
      try {
        const body = await request.json();
        title = body.title || "";
        notes = body.body || body.notes || "";
        author = body.author || "";
        domain = body.domain || "";
        subjects = body.subjects || "";
        keywords = body.keywords || "";
        supersedes = body.supersedes || "";
        superseded_by = body.superseded_by || "";
      } catch {
        return json({ error: "multipart or JSON body required" }, 400);
      }
    }
    try {
      return json(
        await jeevesUpload(env, {
          signed: who,
          file,
          title,
          body: notes,
          author,
          domain,
          subjects,
          keywords,
          supersedes,
          superseded_by,
        })
      );
    } catch (err) {
      return json({ error: err && err.message ? err.message : "upload failed" }, err && err.status ? err.status : 400);
    }
  }
  return null;
}

export function jeevesFabHtml(signed) {
  const op = isOperator(signed);
  const dest = op ? "Aziel Library" : "Corpus";
  return `<button type="button" class="jeeves-fab" id="jeevesFab" aria-expanded="false" aria-controls="jeevesDrawer">Ask Jeeves</button>
<aside class="jeeves-drawer" id="jeevesDrawer" hidden>
  <header class="jeeves-head"><strong>Ask Jeeves</strong><button type="button" class="jeeves-x" id="jeevesClose" aria-label="Close">×</button></header>
  <p class="muted jeeves-note">Research assistant. Not sovereign. Not the operator. Cannot change scores. Add uses the same ingest path as the shelf.</p>
  <div class="jeeves-log" id="jeevesLog" aria-live="polite"></div>
  <form class="jeeves-ask" id="jeevesAsk">
    <label class="sr-only" for="jeevesQ">Question</label>
    <textarea id="jeevesQ" name="q" rows="2" maxlength="2000" placeholder="Ask about a filed record…"></textarea>
    <button type="submit">Ask</button>
  </form>
  <details class="jeeves-add"><summary>Add a file</summary>
    <form class="jeeves-up" id="jeevesUp" enctype="multipart/form-data">
      <label class="filepick">File<input type="file" name="file"></label>
      <input name="title" placeholder="Title">
      <textarea name="body" rows="3" placeholder="Notes"></textarea>
      <p class="muted">Same ingest as the shelf: structure, SPRE × CLCE × PhysLing, Bayesian, document hash-chain. Files go to ${dest}.</p>
      <button type="submit">Add</button>
    </form>
  </details>
</aside>
<script>
(function(){
  var fab=document.getElementById("jeevesFab");
  var drawer=document.getElementById("jeevesDrawer");
  var close=document.getElementById("jeevesClose");
  var log=document.getElementById("jeevesLog");
  var ask=document.getElementById("jeevesAsk");
  var up=document.getElementById("jeevesUp");
  function open(){drawer.hidden=false;fab.setAttribute("aria-expanded","true");}
  function shut(){drawer.hidden=true;fab.setAttribute("aria-expanded","false");}
  function esc(s){return String(s||"").replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c]});}
  var snake=null;
  function cloneSnake(st){return {w:st.w,h:st.h,snake:st.snake.map(function(p){return {x:p.x,y:p.y};}),dir:st.dir,food:{x:st.food.x,y:st.food.y},score:st.score,alive:st.alive};}
  function startSnake(st){st=st||{};return {w:st.w||12,h:st.h||8,snake:(st.snake&&st.snake.length)?st.snake.map(function(p){return {x:p.x,y:p.y};}):[{x:4,y:4},{x:3,y:4},{x:2,y:4}],dir:st.dir||"right",food:st.food||{x:8,y:4},score:st.score||0,alive:st.alive!==false};}
  function parseMove(t){var n=String(t||"").trim().toLowerCase();if(/^(quit|exit|stop|end)$/.test(n))return"quit";if(/^(up|u|north|\\^)$/.test(n))return"up";if(/^(down|d|south|v)$/.test(n))return"down";if(/^(left|l|west|<)$/.test(n))return"left";if(/^(right|r|east|>)$/.test(n))return"right";return null;}
  function opposite(a,b){return (a==="up"&&b==="down")||(a==="down"&&b==="up")||(a==="left"&&b==="right")||(a==="right"&&b==="left");}
  function moveSnake(st,dir){
    st=cloneSnake(startSnake(st));
    if(!st.alive)return st;
    if(dir&&!opposite(st.dir,dir))st.dir=dir;
    var h=st.snake[0];
    var nx=h.x+(st.dir==="left"?-1:st.dir==="right"?1:0);
    var ny=h.y+(st.dir==="up"?-1:st.dir==="down"?1:0);
    if(nx<0||ny<0||nx>=st.w||ny>=st.h){st.alive=false;return st;}
    for(var i=0;i<st.snake.length-1;i++){if(st.snake[i].x===nx&&st.snake[i].y===ny){st.alive=false;return st;}}
    st.snake.unshift({x:nx,y:ny});
    if(nx===st.food.x&&ny===st.food.y){
      st.score++;
      var taken={};
      st.snake.forEach(function(p){taken[p.x+","+p.y]=1;});
      var spots=[];
      for(var y=0;y<st.h;y++)for(var x=0;x<st.w;x++)if(!taken[x+","+y])spots.push({x:x,y:y});
      st.food=spots.length?spots[(st.score*7+3)%spots.length]:{x:nx,y:ny};
    }else st.snake.pop();
    return st;
  }
  function renderSnake(st){
    st=startSnake(st);
    var rows=["+"+Array(st.w+1).join("-")+"+"];
    for(var y=0;y<st.h;y++){
      var row="|";
      for(var x=0;x<st.w;x++){
        var ch=".",i;
        if(st.food.x===x&&st.food.y===y)ch="*";
        for(i=0;i<st.snake.length;i++){if(st.snake[i].x===x&&st.snake[i].y===y){ch=i===0?"@":"o";break;}}
        row+=ch;
      }
      rows.push(row+"|");
    }
    rows.push("+"+Array(st.w+1).join("-")+"+");
    return rows.join("\\n")+"\\n\\n"+(st.alive?("Score "+st.score+". up/down/left/right or U/D/L/R · quit to stop"):("Game over. Score "+st.score+". Konami again to replay."));
  }
  function line(who,text,opts){opts=opts||{};var d=document.createElement("div");d.className="jeeves-msg";var b=document.createElement("b");b.textContent=who;d.appendChild(b);if(text){if(opts.pre||/\\n/.test(text)){var pre=document.createElement("pre");pre.className="jeeves-snake";pre.textContent=text;d.appendChild(pre);}else{d.appendChild(document.createTextNode(" "+text));}}if(opts.image){var img=document.createElement("img");img.className="jeeves-egg-img";img.src=opts.image;img.alt=opts.image_alt||"Ask Jeeves";img.loading="lazy";d.appendChild(img);}log.appendChild(d);log.scrollTop=log.scrollHeight;}
  fab.addEventListener("click",function(){if(drawer.hidden)open();else shut();});
  close.addEventListener("click",shut);
  ask.addEventListener("submit",function(e){
    e.preventDefault();
    var q=document.getElementById("jeevesQ").value.trim();
    if(!q)return;
    line("You",q);
    document.getElementById("jeevesQ").value="";
    if(snake&&snake.alive){
      var mv=parseMove(q);
      if(mv==="quit"){snake=null;line("Jeeves","Snake ended.");return;}
      if(mv){snake=moveSnake(snake,mv);line("Jeeves",renderSnake(snake),{pre:true});if(!snake.alive)snake=null;return;}
    }
    fetch("/v1/jeeves/chat",{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({question:q})})
      .then(function(r){return r.json();})
      .then(function(j){var text=(j.answer!=null&&String(j.answer)!=="")?j.answer:(j.image?"":(j.error||"No answer"));line("Jeeves",text,{image:j.image||null,image_alt:j.image_alt||null,pre:j.easter_egg==="konami_snake"});if(j.easter_egg==="konami_snake")snake=j.snake||startSnake();})
      .catch(function(){line("Jeeves","Could not reach the assistant.");});
  });
  up.addEventListener("submit",function(e){
    e.preventDefault();
    var fd=new FormData(up);
    fetch("/v1/jeeves/upload",{method:"POST",body:fd})
      .then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j};});})
      .then(function(x){
        if(!x.ok){line("Jeeves",x.j.error||"Upload failed");return;}
        var dest=x.j.library==="aziel"?"Aziel Library":"Corpus";
        var score=(x.j.triad&&x.j.triad.display!=null)?" Triad "+x.j.triad.display+".":"";
        line("Jeeves","Filed to "+dest+" as "+x.j.record_id+"."+score+" Same review engines.");
        if(x.j.href){var a=document.createElement("a");a.href=x.j.href;a.textContent="Open "+x.j.record_id;a.className="button ghost";log.appendChild(a);}
      })
      .catch(function(){line("Jeeves","Upload failed.");});
  });
})();
</script>`;
}

