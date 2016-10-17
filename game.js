
const VERSION = 3;

// Thanks https://developer.mozilla.org/en-US/docs/Web/API/Storage/LocalStorage
if (!window.localStorage) {
  Object.defineProperty(window, "localStorage", new (function () {
    var aKeys = [], oStorage = {};
    Object.defineProperty(oStorage, "getItem", {
      value: function (sKey) { return sKey ? this[sKey] : null; },
      writable: false,
      configurable: false,
      enumerable: false
    });
    Object.defineProperty(oStorage, "key", {
      value: function (nKeyId) { return aKeys[nKeyId]; },
      writable: false,
      configurable: false,
      enumerable: false
    });
    Object.defineProperty(oStorage, "setItem", {
      value: function (sKey, sValue) {
        if(!sKey) { return; }
        document.cookie = escape(sKey) + "=" + escape(sValue) + "; expires=Tue, 19 Jan 2038 03:14:07 GMT; path=/";
      },
      writable: false,
      configurable: false,
      enumerable: false
    });
    Object.defineProperty(oStorage, "length", {
      get: function () { return aKeys.length; },
      configurable: false,
      enumerable: false
    });
    Object.defineProperty(oStorage, "removeItem", {
      value: function (sKey) {
        if(!sKey) { return; }
        document.cookie = escape(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      },
      writable: false,
      configurable: false,
      enumerable: false
    });
    this.get = function () {
      var iThisIndx;
      for (var sKey in oStorage) {
        iThisIndx = aKeys.indexOf(sKey);
        if (iThisIndx === -1) { oStorage.setItem(sKey, oStorage[sKey]); }
        else { aKeys.splice(iThisIndx, 1); }
        delete oStorage[sKey];
      }
      for (aKeys; aKeys.length > 0; aKeys.splice(0, 1)) { oStorage.removeItem(aKeys[0]); }
      for (var aCouple, iKey, nIdx = 0, aCouples = document.cookie.split(/\s*;\s*/); nIdx < aCouples.length; nIdx++) {
        aCouple = aCouples[nIdx].split(/\s*=\s*/);
        if (aCouple.length > 1) {
          oStorage[iKey = unescape(aCouple[0])] = unescape(aCouple[1]);
          aKeys.push(iKey);
        }
      }
      return oStorage;
    };
    this.configurable = false;
    this.enumerable = true;
  })());
}
// Note: the following two function are limited to native ints
// Thanks https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
// Returns a random number between min (inclusive) and max (exclusive)
function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}
// Returns a random integer between min (included) and max (excluded)
// Using Math.round() will give you a non-uniform distribution!
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}
// Returns a random integer between min (included) and max (included)
// Using Math.round() will give you a non-uniform distribution!
function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

var game = {};
var iMsgLog = [];
var msgLog = [];
var needRefresh = false;
var lastWordsSaid = false;
var tooltipVisible = false;
const MAX_LOG_ENTRIES = 100;

function beautify(n) {
  var ns = n.toString();
  var len = ns.length;
  var head = len % 3 || 3; // kek
  var res = ns.slice(0, head);
  for (var i = head; i < len; i += 3) {
    res += "," + ns.slice(i, i + 3);
  }
  return res;
}

var words = [
  "million", "billion", "trillion", "quadrillion",
  "quintillion", "sextillion", "septillion", "octillion",
  "nonillion", "decillion", "undecillion", "duodecillion",
  "tredecillion", "quattuordecillion", "quindecillion",
  "sedecillion", "septendecillion", "octodecillion",
  "novemdecillion", "vigintillion"
];
var pcOfLast = words.length + 1;

function shorten(n) {
  if (n === undefined) return "undefined";
  if (n.valueOf() < 1000000) return beautify(n);
  var ns = n.toString();
  var power = ns.length - 1;
  var cls = Math.floor(power / 3);
  var residue = power % 3;
  if (cls > pcOfLast) {
    return shorten(ns.slice(0, ns.length - 3 * pcOfLast)) +
      " " + words[words.length - 1];
  } else {
    var left = ns.slice(0, residue + 1);
    var right = ns.slice(residue + 1, 6);
    return left + "." + right + " " + words[cls - 2];
  }
}

function beautifyTime(t) {
  var s = [];
  if (t >= 3600 * 20) {
    var h = Math.floor(t / (3600 * 20));
    s.push([h + " hours"]);
    t -= 3600 * 20 * h
  }
  if (t >= 60 * 20) {
    var m = Math.floor(t / (60 * 20));
    s.push([m + " minutes"]);
    t -= 60 * 20 * m
  } 
  s.push([(t / 20).toFixed(1) + " seconds"]);
  return s.join(", ");
}

// Thanks http://stackoverflow.com/a/196991/3130218
function toTitleCase(str) {
  if (str === undefined) return "uNDEFINED";
  return str.replace(/\w\S*/g, function(txt){ return txt.charAt(0).toUpperCase() + txt.substr(1); });
}

function isVowelInitial(str) {
  return str.match(/^[AEIOUaeiou]/) != null;
}
function attachA(str) {
  return (isVowelInitial(str) ? "an " : "a ") + str;
}

function substSafe(obj) {
  if (obj.xor) return { xor: obj.toString() };
  if (typeof(obj) !== "object") return obj;
  var upd = {};
  for (var key in obj) {
    var val = obj[key];
    upd[key] = substSafe(val);
  }
  return upd;
}

function desubstSafe(obj) {
  if (obj.xor) return bigInt(obj.xor);
  if (typeof(obj) !== "object") return obj;
  var upd = {};
  for (var key in obj) {
    var val = obj[key];
    upd[key] = desubstSafe(val);
  }
  return upd;
}

function save() {
  if (game.died) return;
  var gameStr = JSON.stringify(substSafe(game));
  localStorage.setItem("Clicker101SaveData", gameStr);
  console.log("Saved: " + gameStr);
  logMessage("Game saved.");
}
function merge(existingGame, newGame) {
  for (var key in newGame) {
    if (existingGame[key] == undefined)
      existingGame[key] = newGame[key];
    else if (typeof(existingGame[key]) === "object") {
      merge(existingGame[key], newGame[key]);
    }
  }
}
function load() {
  resetGame();
  var newGame = game;
  var gameStr = localStorage.getItem("Clicker101SaveData");
  if (gameStr === null) {
    resetGame();
    return;
  }
  game = desubstSafe(JSON.parse(gameStr));
  merge(game, newGame);
  for (var key in game.staffPrice) {
    var amt = game.staff[key];
    game.staffPrice[key] = increase(baseStaffPrices[key], amt);
  }
  game.version = VERSION;
  console.log("Loaded: " + gameStr);
  loadStaff();
  loadUpgrades();
  logMessage("Game loaded.");
  if (game.died) onDeath();
  else onLife();
}

function refreshAutoSaveMessage() {
  var button = document.getElementById("autosave");
  button.innerHTML = "Autosave " +
    (game.autosave ? "ON" : "OFF");
}

function toggleAutoSave() {
  game.autosave = !game.autosave;
}

function autoSave() {
  if (game.autosave) save();
}

function logMessage(msg) {
  iMsgLog.push(msg);
  needRefresh = true;
}

function refreshLog() {
  if (needRefresh) {
    msgLog = iMsgLog.concat(msgLog);
    iMsgLog = [];
    if (msgLog.length >= 2 * MAX_LOG_ENTRIES) {
      msgLog = msgLog.slice(0, MAX_LOG_ENTRIES);
    }
    var recentMessages = msgLog.slice(
      0, Math.min(msgLog.length - 1, MAX_LOG_ENTRIES));
    var box = document.getElementById("msglog");
    box.innerHTML = recentMessages.join('<br>');
    needRefresh = false;
    if (game.died) lastWordsSaid = true;
  }
}

function resetGame() {
  game = {};
  game.ver = 0;
  game.resources = {
    gold: bigInt.zero,
    xp: bigInt.zero,
    level: bigInt.one,
    crowns: bigInt.zero,
    activePlayers: bigInt("20000000"),
    population: bigInt("7000000000"),
    gear: bigInt.zero,
    loot: bigInt.zero,
  };
  game.hres = {
    gps: bigInt.zero,
    agr: -30,
    bagr: -30,
    pgr: 12,
    pp: 100,
  };
  game.staff = {};
  game.staffPrice = {};
  game.upgrades = {};
  game.died = false;
  game.autosave = true;
  game.cumulGold = 0;
  game.cumulGear = 0;
  game.timer = 0;
  game.gps = bigInt.zero;
  game.special = {};
  game.version = VERSION;
  var staffList = document.getElementById("staff");
  staffList.innerHTML = "";
  var upgradeList = document.getElementById("upgrades");
  upgradeList.innerHTML = "";
  var purchasedUpgradeList = document.getElementById("purchased-upgrades");
  purchasedUpgradeList.innerHTML = "";
  onLife();
}

var resourceNames = {
  gold: "gold",
  xp: "experience",
  level: "level",
  crowns: "Crowns",
  loot: "loot",
  gear: "awesome gear",
  activePlayers: "active players",
  population: "population",
};

function resAmt(name, qty, inflation) {
  if (!qty.xor) qty = bigInt(qty);
  if (!inflation) inflation = 23;
  return {
    "type": name,
    "qty": qty,
    "inflation": inflation
  };
}
function increase(price, units) {
  return price.map(function (res) {
    return {
      "type": res.type,
      "qty": res.qty.times(bigInt(res.inflation).pow(units)).divide(bigInt(20).pow(units)),
      "inflation": res.inflation
    };
  })
}
function priceToString(price) {
  return price.map(function (res) {
    return shorten(res.qty) + " " + resourceNames[res.type];
  }).join(", ");
}
function canAfford(price) {
  return price.every(function (res) {
    return game.resources[res.type] &&
      game.resources[res.type].greaterOrEquals(res.qty)
  });
}
function whatIsInsufficient(price) {
  return price.filter(function (res) {
    return !game.resources[res.type] ||
      game.resources[res.type].lesser(res.qty)
  }).map(function (res) { return res.type; });
}
function deductPrice(price) {
  return price.map(function (res) {
    game.resources[res.type] = game.resources[res.type].minus(res.qty);
  });
}
function growthRatePrognostics(rate) {
  if (rate < -500) return "might as well be dead";
  if (rate < -250) return "is quickly dying";
  if (rate < -100) return "is dying";
  if (rate < -50) return "is diminishing";
  if (rate < 0) return "is slowly diminishing";
  if (rate < 30) return "is doing fairly";
  if (rate < 100) return "is doing well";
  if (rate < 200) return "is thriving";
  return "is booming";
}

function displayResources() {
  if (game.died) return;
  var resources = game.resources;
  var resourcePanel = document.getElementsByClassName("resources")[0];
  var inner = "";
  for (var res in resources) {
    if (res == "gold" || res == "xp" || resources[res].valueOf() != 0) {
      inner += toTitleCase(resourceNames[res]) + ": " +
        beautify(resources[res]);
      if (res == "xp") {
        inner += " / " + beautify(xpNeeded(game.resources.level));
      }
      inner += "<br>";
    }
  }
  var rate = game.hres.agr;
  inner += "Your favorite game " + growthRatePrognostics(rate) + ".<br>"
  resourcePanel.innerHTML = inner;
}

var staffNames = {
  novice: "novice wizard",
  apprentice: "apprentice wizard",
  initiate: "initiate wizard",
  fanboy: "ardent fan",
  journeyman: "journeyman wizard",
  adept: "adept wizard",
  magus: "magus wizard",
  master: "master wizard",
  grandmaster: "grandmaster wizard",
  gearCrafter: "gear crafter",
  legendary: "legendary wizard",
  transcendent: "transcendent wizard",
  pvpLord: "PvP warlord",
  archmage: "archmage wizard",
  promethean: "promethean wizard",
  exalted: "exalted wizard",
  trivia: "trivia monkey",
  prodigious: "prodigious wizard",
};
var staffDescriptions = {
  novice: "A beginner to farm for you.",
  apprentice: "Someone more experienced with magic.",
  initiate: "This wizard now knows Rank-3 spells.",
  fanboy: "A player who is engrossed in ***ard101.",
  journeyman: "A wizard who has experience fighting in K***otopia. I hope.",
  adept: "This wizard is now solving incidents in M********e.",
  magus: "A hardened veteran in M*****.",
  master: "Well-versed in magical combat, this player is ready to face the travails of D**********.",
  grandmaster: "This wizard has survived the backbreaking effort to stop M********* D****, once and for all.",
  gearCrafter: "Crafts high-level gear.",
  legendary: "A level 60 wizard who is now leaving C******a and entering Z*****a.",
  transcendent: "An even-higher level wizard to farm large amounts of gold.",
  pvpLord: "A PvP master to attract even more players.",
  archmage: "Best of luck to this wizard on A****a.",
  promethean: "<b><i>OH NO WHAT HAPPENED TO A****A</i></b>",
  exalted: "This wizard restored B****** and defeated M********, saving the spiral. Sizzle, young wizard, sizzle.",
  trivia: "A NEET to complete trivias for you.",
  prodigious: "The strongest in ***ard101, at least until M***** is released.",
};
var baseStaffPrices = {
  novice: [resAmt("gold", 30)],
  apprentice: [resAmt("gold", 200)],
  initiate: [resAmt("gold", 550)],
  fanboy: [resAmt("gold", 860)],
  journeyman: [resAmt("gold", 2500)],
  adept: [resAmt("gold", 8000)],
  magus: [resAmt("gold", 17800)],
  master: [resAmt("gold", 55000)],
  grandmaster: [resAmt("gold", 160000)],
  gearCrafter: [resAmt("gold", 200000)],
  legendary: [resAmt("gold", 680000)],
  transcendent: [resAmt("gold", 1890000)],
  pvpLord: [resAmt("gold", 700000)],
  archmage: [resAmt("gold", 5600000)],
  promethean: [resAmt("gold", 27800000)],
  exalted: [resAmt("gold", 345678901)],
  trivia: [resAmt("gold", 10000000), resAmt("crowns", 50, 20)],
  prodigious: [resAmt("gold", "88888888888")],
};

function staffCount(name) {
  return game.staff[name] || 0;
}

function levelMinimum(l) {
  return function() { return game.resources.level.greaterOrEquals(l) }
}
var wizardClasses = {
  novice: true,
  apprentice: true,
  initiate: true,
  journeyman: true,
  adept: true,
  magus: true,
  master: true,
  grandmaster: true,
  legendary: true,
  transcendent: true,
  archmage: true,
  promethean: true,
  exalted: true,
  prodigious: true,
};
function wizardCount() {
  var c = 0;
  for (var key in wizardClasses) {
    c += game.staff[key] || 0;
  }
  return c;
}
function wizardMinimum(u) {
  return function() {
    var c = 0;
    for (var key in wizardClasses) {
      c += game.staff[key] || 0;
    }
    return c >= u;
  }
}
function staffMinimum(name, count) {
  return function() {
    return staffCount(name) >= count;
  }
}
var staffRequirements = {
  novice: function () { return true; },
  apprentice: levelMinimum(5),
  initiate: levelMinimum(10),
  fanboy: levelMinimum(12),
  journeyman: levelMinimum(15),
  adept: levelMinimum(20),
  magus: levelMinimum(30),
  master: levelMinimum(40),
  grandmaster: levelMinimum(50),
  gearCrafter: levelMinimum(56),
  legendary: levelMinimum(60),
  transcendent: levelMinimum(70),
  pvpLord: function () {
    return game.upgrades.arena && game.resources.level.greaterOrEquals(60);
  },
  archmage: levelMinimum(80),
  promethean: levelMinimum(90),
  exalted: levelMinimum(100),
  trivia: function() {
    return game.resources.crowns.greaterOrEquals(150);
  },
  prodigious: levelMinimum(110),
}

function updateStaffCount(name, amt) {
  var staffQty = document.getElementById("staffQty-" + name);
  var staffPrice = document.getElementById("staffPrice-" + name);
  var oldAmt = game.staff[name];
  var oldPrice = game.staffPrice[name];
  var newPrice;
  if (amt < oldAmt) {
    newPrice = increase(baseStaffPrices[name], amt);
  } else {
    newPrice = increase(baseStaffPrices[name], amt);
  }
  game.staffPrice[name] = newPrice;
  game.staff[name] = amt;
  staffQty.innerHTML = amt;
  staffPrice.innerHTML = priceToString(newPrice);
}

function buyStaff(name) {
  var needed = whatIsInsufficient(game.staffPrice[name]);
  if (needed.length != 0)
    return needed;
  deductPrice(game.staffPrice[name]);
  updateStaffCount(name, game.staff[name] + 1);
  return [];
}

function neededToString(needed, and) {
  if (!needed.length) return "NOTHING";
  if (needed.length == 1)
    return resourceNames[needed[0]];
  if (needed.length == 2)
    return resourceNames[needed[0]] + (and ? " and " : " or ") + resourceNames[needed[1]];
  var realNames = needed.map(function (nm) { return resourceNames[nm]; });
  return realNames.slice(0, needed.length - 1).join(", ") +
    (and ? ", and " : ", or ") + resourceNames[needed[needed.length - 1]];
}

function buyStaffVerbose(name) {
  var needed = buyStaff(name);
  logMessage(needed.length == 0 ?
    "You successfully purchased " + attachA(staffNames[name]) + "." :
    "You don't have enough " + neededToString(needed, false) + ".");
}

function updateStaff() {
  var staffList = document.getElementById("staff");
  for (var staffName in staffRequirements) {
    if (game.staff[staffName] === undefined && staffRequirements[staffName]()) {
      var html = "<tr><td class=\"staffEntry\" id=\"staff-" + staffName + "\">";
      html += "<b>" + toTitleCase(staffNames[staffName]) + "</b><br>";
      html += staffDescriptions[staffName] + "<br>";
      html += "Quantity: <span class=\"staffPrice\" id=\"staffQty-" +
        staffName + "\">0</span><br>";
      html += "Price: <span class=\"staffPrice\" id=\"staffPrice-" +
        staffName + "\">" + priceToString(baseStaffPrices[staffName]) + "</span><br>";
      html += "</td><td>";
      html += "<button type=\"button\" onclick=\"buyStaffVerbose('" +
        staffName + "')\" class=\"disableWhenDead\">Buy</button>"
      html += "</td></tr>";
      staffList.innerHTML += html;
      game.staff[staffName] = 0;
      game.staffPrice[staffName] = baseStaffPrices[staffName];
    }
  }
}

function loadStaff() {
  var staffList = document.getElementById("staff");
  staffList.innerHTML = "";
  for (var staffName in game.staff) {
    var html = "<tr><td class=\"staffEntry\" id=\"staff-" + staffName + "\">";
    html += "<b>" + toTitleCase(staffNames[staffName]) + "</b><br>";
    html += staffDescriptions[staffName] + "<br>";
    html += "Quantity: <span class=\"staffPrice\" id=\"staffQty-" +
      staffName + "\">" + game.staff[staffName] + "</span><br>";
    html += "Price: <span class=\"staffPrice\" id=\"staffPrice-" +
      staffName + "\">" + priceToString(game.staffPrice[staffName]) + "</span><br>";
    html += "</td><td>";
    html += "<button type=\"button\" onclick=\"buyStaffVerbose('" +
      staffName + "')\" class=\"disableWhenDead\">Buy</button>"
    html += "</td></tr>";
    staffList.innerHTML += html;
  }
}

var upgradeNames = {
  socialMedia: "Social media",
  test: "Raunchy hex",
  bears: "G******heim",
  littleBrother: "Little brother",
  questStack: "Quest stacking",
  lessons: "D****'s lessons",
  party: "Questing party",
  arena: "Gold-lined arena",
  valor: "Fight J****!",
  rank7: "Rank 7 spells",
  mount: "Awesome mount",
  weed: "Extra-strength grendelweed",
  winter: "Winter is coming",
  goldFarm: "Half*** B******C****",
  sun: "Sun magic",
  bazaar: "Bazaar",
  youtube: "YouTube",
  war: "War on twizard intros",
  pvpVideos: "PvP videos",
  synergy1: "Synergy I: Border between PvE and PvP",
  critical: "Criticality",
  tc: "Treasure cards",
  luis: "Secrets from Luis",
  sun2: "Sun magic part 2",
  runLuis: "Run Run Dino!",
  empire: "World empire",
  wand: "Finger-shaped wand",
  bastion: "B****** Restoration Project",
  shadow: "Shadow magic",
  sea: "Starf*** Sea",
  ww: "W****w***s",
  com1: "First Chamber of the Mind",
  com2: "Second Chamber of the Mind",
  com3: "Third Chamber of the Mind",
  a1f: "Defeat M**********",
  a2f: "Defeat Shadow Queen",
  empire2: "Galactic empire",
  trivia: "KI Trivia",
  tree: "B*****by's Wisdom",
  dark: "D***m***",
};

var upgradeDescriptions = {
  socialMedia: "Your recruiting spreads quickly, and <b>recruiting is 10 times more effective.</b>",
  test: "Clicking gives <b>2 more gold.</b>",
  bears: "You establish trade with the bears, so <b>you and adept or higher wizards collect twice as much gold.</b>",
  littleBrother: "Your little brother starts playing the game. He's not very good, but he collects <b>1 XP per second</b> for you.",
  questStack: "You quest more efficiently; <b>clicking yields 50% more experience.</b>",
  lessons: "Our favorite anthropomorphic horses offers you a lesson in combat; <b>you and initiate or higher wizards collect 50% more gold.</b>",
  party: "With a team, you can complete dungeons faster. <b>Getting boss drops from clicking is twice as likely.</b>",
  arena: "<b>The game shouldn't die as quickly.</b> (Despite what SkythekidRS suggests, the arena is <i>not</i> lined with butter.)",
  valor: "Fight the hardest boss in the whole first arc, and earn the glory of <b>double gold to you and master or higher wizards!</b>",
  rank7: "After loads of testing, these spells are available to you! <b>Clicking and master or higher wizards get 50% more gold.</b>",
  mount: "(OK, I lied. I just bought one of the mounts in the Crown Shop that were available for gold.) <b>You gain twice as much gold and experience.</b>",
  weed: "<b>Euphoria subsides half as quickly.</b>",
  winter: "Provides access to Wintertusk.",
  goldFarm: "You find a boss that drops great loot. <b>You and legendary or higher wizards have a chance to get loot.</b>",
  sun: "As you find ways to make your attacks even powerful, <b>you and legendary or higher wizards collect 50% more gold.</b>",
  bazaar: "You find that E*** is willing to buy your loot, so <b>you get twice as much money from selling loot.</b> (Needless to say, he isn't as willing to take your Waterworks gear.)",
  youtube: "People start watching your videos, and <b>recruiting is twice as powerful.</b>",
  war: "As you fight tooth and nail against those spinning 3-D names coupled with loud music, <b>recruiting is twice as powerful.</b>",
  pvpVideos: "You start recording yourself playing PvP matches. <b>The game should take even longer to die.</b>",
  synergy1: "<b>Legendary or higher wizards get 1% more gold per PvP warlord. PvP warlords attract 0.1% more players for each wizard.</b>",
  critical: "Clicking has a <b>10% chance of doubling your yield.<b> Your brother has a <b>10% chance to get twice as much experience.</b>",
  tc: "All wizards earn <b>20% more gold.</b>",
  luis: "You automatically click <b>every 5 seconds.</b>",
  sun2: "Sharpened Blade, Potent Trap, and Primordial, oh my! <b>You and archmage and higher wizards collect twice as much gold.</b>",
  runLuis: "X*****a is falling, and <b>auto-clicking is twice as frequent.</b>",
  empire: "Now that the whole world is playing ***ard101, <b>gold output is quadrupled.</b>",
  wand: "Clicking is boosted by <b>1% of GPS.</b>",
  bastion: "Claim whatever artifact you need and restore the B****** to its former glory.",
  shadow: "Gold output is tripled for you and promethean or higher wizards, but <b>the game will take a hit in popularity.</b>",
  sea: "Cross the treacherous sea inside the great beast. To the other side (and no, I don't mean dying)!",
  ww: "Legendary or higher wizards <b>occasionally get gear</b>.",
  com1: "Now you must land in the mind of the Shadow Queen, back when she was still a youngster, when she was in A*****, under the command of A******, and plot to kill the king.",
  com2: "You are now at the R****wood School of Magic. You battle the Death professor M********* D****, but at what cost...",
  com3: "Being ousted from R****wood, you partner with T***** C***r**** at the Crescent Beach for the promise of a great prize...",
  a1f: "It all started when someone lost his wife and lost his sit. Time to end it.",
  a2f: "Defeat M********, the shadow lord, and <b>you and exalted or higher wizards get five times more gold.</b>",
  empire2: "***ard101 is so popular, aliens are buying computers just to play it themselves. <b>Clicking is ten times more effective.</b>",
  trivia: "Allows you to complete trivia questions <b>ten times every hour</b> for crowns.",
  tree: "<b>+1% to gold drops</b> per hour of play.",
  dark: "Exalted or higher wizards drop <b>even more gear</b>.",
};

var upgradeRequirements = {
  socialMedia: levelMinimum(5),
  test: function() { return true; },
  bears: levelMinimum(20),
  littleBrother: levelMinimum(15),
  questStack: levelMinimum(7),
  lessons: levelMinimum(10),
  party: levelMinimum(25),
  arena: wizardMinimum(100),
  valor: function() {
    return game.resources.level.greaterOrEquals(40) &&
      game.upgrades.bears && game.upgrades.party;
  },
  rank7: levelMinimum(48),
  mount: function() { return true; },
  weed: function() {
    return game.resources.level.greaterOrEquals(45) &&
      game.upgrades.valor;
  },
  winter: function() {
    return game.resources.level.greaterOrEquals(55) &&
      game.upgrades.valor;
  },
  goldFarm: function() {
    return game.upgrades.winter;
  },
  sun: levelMinimum(58),
  bazaar: levelMinimum(10),
  youtube: function() {
    return game.resources.level.greaterOrEquals(20) &&
      game.upgrades.socialMedia;
  },
  war: function() {
    return game.resources.level.greaterOrEquals(40) &&
      game.upgrades.youtube;
  },
  pvpVideos: function() {
    return game.upgrades.youtube && game.upgrades.arena;
  },
  synergy1: levelMinimum(70),
  critical: levelMinimum(50),
  tc: staffMinimum("novice", 50),
  luis: levelMinimum(75),
  sun2: function() {
    return game.resources.level.greaterOrEquals(86) &&
      game.upgrades.sun;
  },
  runLuis: function() {
    return game.resources.level.greaterOrEquals(90) &&
      game.upgrades.luis;
  },
  empire: function() {
    return game.resources.activePlayers.greaterOrEquals(game.resources.population);
  },
  wand: levelMinimum(15),
  bastion: levelMinimum(93),
  shadow: function() {
    return game.resources.level.greaterOrEquals(95) &&
      game.upgrades.bastion;
  },
  sea: function() {
    return game.resources.level.greaterOrEquals(95) &&
      game.upgrades.bastion;
  },
  ww: levelMinimum(60),
  com1: function() {
    return game.resources.level.greaterOrEquals(96) &&
      game.upgrades.sea;
  },
  com2: function() {
    return game.resources.level.greaterOrEquals(97) &&
      game.upgrades.com1;
  },
  com3: function() {
    return game.resources.level.greaterOrEquals(98) &&
      game.upgrades.com2;
  },
  a1f: levelMinimum(45),
  a2f: function() {
    return game.resources.level.greaterOrEquals(100) &&
      game.upgrades.com3;
  },
  empire2: function() {
    return game.resources.activePlayers.divide(100).greaterOrEquals(game.resources.population);
  },
  trivia: levelMinimum(80),
  tree: function() {
    return game.upgrades.a2f;
  },
  dark: function() {
    return game.resources.level.greaterOrEquals(100) &&
      game.upgrades.ww && game.upgrades.a2f;
  },
};

var upgradePrices = {
  socialMedia: [resAmt("gold", 1500)],
  test: [resAmt("gold", 69)],
  bears: [resAmt("gold", 30000)],
  littleBrother: [resAmt("gold", 300)],
  questStack: [resAmt("gold", 1000)],
  lessons: [resAmt("gold", 2500)],
  party: [resAmt("gold", 45000)],
  arena: [resAmt("gold", 200000)],
  valor: [resAmt("gold", 500000), resAmt("activePlayers", 40000)],
  rank7: [resAmt("gold", 100000)],
  mount: [resAmt("gold", 30000)],
  weed: [resAmt("gold", 1000000)],
  winter: [resAmt("gold", 1000000)],
  goldFarm: [resAmt("gold", 1500000)],
  sun: [resAmt("gold", 750000)],
  bazaar: [resAmt("gold", 3000)],
  youtube: [resAmt("gold", 9000)],
  war: [resAmt("gold", 400000)],
  pvpVideos: [resAmt("gold", 600000)],
  synergy1: [resAmt("gold", 40000000)],
  critical: [resAmt("gold", 80000)],
  tc: [resAmt("gold", 2000)],
  luis: [resAmt("gold", 250000000)],
  sun2: [resAmt("gold", 350000000)],
  runLuis: [resAmt("gold", 650000000)],
  empire: [
    resAmt("gold", "1000000000000"),
    resAmt("activePlayers", "200000000000"),
    resAmt("population", "200000000000")
  ],
  wand: [resAmt("gold", 45000)],
  bastion: [resAmt("gold", 750000000), resAmt("gear", 500)],
  shadow: [resAmt("gold", 250000000)],
  sea: [resAmt("gold", 950000000), resAmt("gear", 500)],
  ww: [resAmt("gold", 1600000)],
  com1: [resAmt("gold", "2000000000")],
  com2: [resAmt("gold", "2500000000")],
  com3: [resAmt("gold", "3000000000")],
  a1f: [resAmt("gold", 5678765)],
  a2f: [resAmt("gold", "40000000000"), resAmt("gear", 1500)],
  empire2: [
    resAmt("gold", "1000000000000000"),
    resAmt("activePlayers", "200000000000000"),
    resAmt("population", "2000000000000")
  ],
  trivia: [resAmt("gold", 1000000000)],
  tree: [resAmt("gold", "100000000000"), resAmt("crowns", 115)],
  dark: [resAmt("gold", "75000000000")],
};

var upgradeImmediateEffects = {
  shadow: function() {
    game.hres.agr -= 2000;
  },
  com1: function() {
    getXP(10000);
  },
  com2: function() {
    getXP(10000);
  },
  com3: function() {
    getXP(10000);
  },
  trivia: function() {
    game.special.trivia = {
      timeLeft: 3600 * 20,
      left: 10,
      cooldown: 0,
    }
  }
}

function reposition(elem, x, y) {
  var height = window.innerHeight;
  var tooltipHeight = elem.offsetHeight;
  if (y + tooltipHeight + 50 >= height) {
    elem.style.top = y - tooltipHeight + 5;
  } else {
    elem.style.top = y + 5;
  }
  elem.style.left = x + 5;
}

function displayTooltip(body, x, y) {
  var tooltip = document.getElementById("tooltip");
  tooltip.innerHTML = body;
  tooltip.style.display = "block";
  tooltipVisible = true;
  reposition(tooltip, x, y);
}

function updateTooltipLocation(event) {
  if (!tooltipVisible) return;
  var tooltip = document.getElementById("tooltip");
  reposition(tooltip, event.clientX, event.clientY);
}

function hideTooltip() {
  var tooltip = document.getElementById("tooltip");
  tooltip.style.display = "none";
  tooltipVisible = false;
}

function displayUpgradeTooltip(upgradeName, event) {
  html = "<b>" + upgradeNames[upgradeName] + "</b><br>";
  if (game.upgrades[upgradeName]) html += "Purchased for ";
  html += priceToString(upgradePrices[upgradeName]) + "<br>";
  html += upgradeDescriptions[upgradeName];
  displayTooltip(html, event.clientX, event.clientY);
}

function upgradeHTML(upgradeName, purchased) {
  var html = "<div><span class=\"upgrade\" id=\"upgrade-" + upgradeName +
    "\" onmouseover=\"displayUpgradeTooltip('" + upgradeName + "', event)\" " + 
    "onmouseout=\"hideTooltip()\"";
  if (!purchased) {
    html += " onclick=\"buyUpgradeVerbose('" + upgradeName + "')\" ";
    html += " style=\"cursor: pointer;\"";
  } else {
    html += " style=\"cursor: default;\"";
  }
  html += ">";
  html += upgradeNames[upgradeName];
  html += "</span></div>";
  return html;
}

function updateUpgrades() {
  var upgradeList = document.getElementById("upgrades");
  for (var upgradeName in upgradeRequirements) {
    if (game.upgrades[upgradeName] === undefined && upgradeRequirements[upgradeName]()) {
      upgradeList.innerHTML += upgradeHTML(upgradeName, false);
      game.upgrades[upgradeName] = 0;
    }
  }
}

function addUpgrade(name) {
  game.upgrades[name] = 1;
  if (upgradeImmediateEffects[name])
    upgradeImmediateEffects[name]();
  var purchasedUpgradeList = document.getElementById("purchased-upgrades");
  var unpurchasedEntry = document.getElementById("upgrade-" + name);
  unpurchasedEntry.remove();
  purchasedUpgradeList.innerHTML += upgradeHTML(name, true);
}

function buyUpgrade(name) {
  var needed = whatIsInsufficient(upgradePrices[name]);
  if (needed.length != 0)
    return needed;
  deductPrice(upgradePrices[name]);
  addUpgrade(name);
  hideTooltip();
  return [];
}

function buyUpgradeVerbose(name) {
  var needed = buyUpgrade(name);
  logMessage(needed.length == 0 ?
    "You successfully purchased " + upgradeNames[name] + "." :
    "You need more " + neededToString(needed, true) + ".");
}

function loadUpgrades() {
  var upgradeList = document.getElementById("upgrades");
  var purchasedUpgradeList = document.getElementById("purchased-upgrades");
  upgradeList.innerHTML = "";
  purchasedUpgradeList.innerHTML = "";
  for (var upgradeName in game.upgrades) {
    if (!game.upgrades[upgradeName]) {
      upgradeList.innerHTML += upgradeHTML(upgradeName, false);
    } else {
      purchasedUpgradeList.innerHTML += upgradeHTML(upgradeName, true);
    }
  }
}

function seppuku() {
  game.died = true;
  onDeath();
}

function seppukuByButton() {
  logMessage("OK, dying.");
  seppuku();
}

var mainButtons = ["thebutton", "recruit", "sell"];
var buttonLabels = ["Click to farm!", "Recruit", "Sell Loot"];

function onDeath() {
  for (var i in mainButtons) {
    var button = document.getElementById(mainButtons[i]);
    button.setAttribute("disabled", "disabled");
    button.innerHTML = "You can't click from the other side!";
  }
  var resourcePanel = document.getElementsByClassName("resources")[0];
  resourcePanel.innerHTML = "<span class=dead>YOU DIED!</dead>";
  var lifeButtons = document.getElementsByClassName("disableWhenDead");
  for (var i in lifeButtons) {
    var button = lifeButtons[i];
    if (button.setAttribute)
      button.setAttribute("disabled", "disabled");
  }
  logMessage("BTW, you can't save from the other side either.");
}

function onLife() {
  for (var i in mainButtons) {
    var button = document.getElementById(mainButtons[i]);
    button.removeAttribute("disabled");
    button.innerHTML = buttonLabels[i];
  }
  var lifeButtons = document.getElementsByClassName("disableWhenDead");
  for (var i in lifeButtons) {
    var button = lifeButtons[i];
    if (button.removeAttribute)
      button.removeAttribute("disabled");
  }
  lastWordsSaid = false;
}

function xpNeeded(level) {
  return level.square().times(5).add(level.times(30)).add(20);
}

function getXP(amt) {
  game.resources.xp = game.resources.xp.add(amt);
  var needed = xpNeeded(game.resources.level);
  if (game.resources.xp.greaterOrEquals(needed)) {
    game.resources.xp = game.resources.xp.minus(needed);
    game.resources.level = game.resources.level.next();
    logMessage("You are now level " + game.resources.level + "!");
  }
}

function treeRate() {
  var hours = Math.floor(game.timer / (3600 * 20));
  return 100 + hours;
}

function clickBigButton(quiet) {
  var gold = bigInt(Math.floor(
    getRandomArbitrary(0, 4) +
    getRandomArbitrary(1.5, 2.5) * game.resources.level
  ));
  if (game.upgrades.lessons) gold = gold.times(3).divide(2);
  if (game.upgrades.bears) gold = gold.times(2);
  if (game.upgrades.valor) gold = gold.times(2);
  if (game.upgrades.rank7) gold = gold.times(3).divide(2);
  if (game.upgrades.mount) gold = gold.times(2);
  if (game.upgrades.sun) gold = gold.times(3).divide(2);
  if (game.upgrades.sun2) gold = gold.times(2);
  if (game.upgrades.empire) gold = gold.times(4);
  if (game.upgrades.shadow) gold = gold.times(3);
  if (game.upgrades.a2f) gold = gold.times(5);
  if (game.upgrades.tree) gold = gold.times(treeRate()).divide(100);
  if (game.upgrades.test) gold = gold.plus(2);
  if (game.upgrades.wand)
    gold = gold.plus(game.gps.divide(100));
  var xp =
    bigInt(3 * Math.floor(getRandomInt(1, 5) + 1.2 * Math.sqrt(game.resources.level)));
  if (game.upgrades.questStack) xp = xp.times(3).divide(2);
  if (game.upgrades.mount) xp = xp.times(2);
  if (Math.random() < 0.05 * (game.upgrades.party ? 2 : 1)) {
    gold = gold.times(getRandomInt(400, 800)).divide(100);
    xp = xp.times(getRandomInt(200, 400)).divide(100);
    game.resources.loot = game.resources.loot.next();
  }
  var crit = false;
  if (game.upgrades.critical && Math.random() < 0.1) {
    gold = gold.times(2);
    xp = xp.times(2);
    crit = true;
    if (!quiet) logMessage("CRITICAL!");
  }
  if (game.upgrades.empire2) {
    gold = gold.times(10);
    xp = xp.times(10);
   }
  if (game.upgrades.goldFarm) {
    game.resources.loot = game.resources.loot.plus(getRandomInt(2, 6 + 4 * crit));
  }
  game.resources.gold = game.resources.gold.add(gold);
  if (!quiet) logMessage("You received " + shorten(gold) + " gold!");
  getXP(xp);
  if (!quiet) logMessage("You received " + shorten(xp) + " experience!");
}

function updatePopulation() {
  game.resources.population =
    game.resources.population.times(1000000 + game.hres.pgr).divide(1000000);
  game.resources.activePlayers =
    game.resources.activePlayers.times(10000000 + game.hres.agr).divide(10000000);
  if (game.resources.activePlayers.lesser(10000)) {
    logMessage("Unfortunately, ***ard101 has closed down because there are no longer enough players.");
    seppuku();
  }
}

function maxPersuaded(base) {
  if (game.upgrades.socialMedia) base *= 10;
  if (game.upgrades.youtube) base *= 2;
  if (game.upgrades.war) base *= 2;
  return base;
}

function recruit() {
  var upTo = 2 + 0.01 * game.hres.pp;
  var players = Math.floor(maxPersuaded(upTo) * Math.random());
  game.resources.activePlayers = game.resources.activePlayers.add(players);
  if (players == 0) {
    logMessage("Bummer! You fail to recruit any players.");
    game.hres.agr -= getRandomInt(10, 20);
  }
  else if (players == 1) logMessage("Someone joins the game.");
  else logMessage("You recruit " + players + " new wizards.");
  if (getRandomInt(0, 10000) < game.hres.pp) {
    logMessage("You feel that the game is becoming more popular.");
    game.hres.agr += 1;
  }
  game.hres.pp = Math.max(0, game.hres.pp - getRandomInt(0, 4));
}

function calculateBAGR() {
  var res = game.hres.bagr;
  if (game.upgrades.arena) res += 4;
  if (game.upgrades.pvpVideos) res += 2;
  return res;
}
function refreshPersuasivePower() {
  if (game.hres.pp >= 100 + game.resources.level || getRandomInt(0, 100) > 0)
    return;
  game.hres.pp = Math.min(100, game.hres.pp + getRandomInt(1, 3));
  if (getRandomArbitrary(0, 5000) * (game.upgrades.weed ? 2 : 1) <
      (game.hres.agr - game.hres.bagr)) {
    logMessage("The euphoria subsides...");
    game.hres.agr--;
  }
}

function recruitAutomatically(power) {
  var players = getRandomArbitrary(0, power / 40) + getRandomArbitrary(0, power / 40);
  players = Math.ceil(maxPersuaded(players));
  game.resources.activePlayers = game.resources.activePlayers.add(players);
  if (getRandomInt(0, 20000) < Math.min(power, 1000)) {
    logMessage("You feel that the game is becoming more popular.");
    game.hres.agr += 1;
  }
}

function doStaffBusiness() {
  var goldEarnings = [
    bigInt(staffCount("novice")).times(getRandomInt(1, 11)).divide(10),
    bigInt(staffCount("apprentice")).times(getRandomInt(1, 9)).divide(2),
    bigInt(staffCount("initiate")).times(getRandomInt(2, 7)),
    bigInt(staffCount("journeyman")).times(getRandomInt(4, 9)),
    bigInt(staffCount("adept")).times(getRandomInt(10, 20)),
    bigInt(staffCount("magus")).times(getRandomInt(25, 35)),
    bigInt(staffCount("master")).times(getRandomInt(40, 65)),
    bigInt(staffCount("grandmaster")).times(getRandomInt(100, 135)),
    bigInt(staffCount("legendary")).times(getRandomInt(300, 350)),
    bigInt(staffCount("transcendent")).times(getRandomInt(950, 1150)),
    bigInt(staffCount("archmage")).times(getRandomInt(2500, 2750)),
    bigInt(staffCount("promethean")).times(getRandomInt(8000, 9001)),
    bigInt(staffCount("exalted")).times(getRandomInt(28000, 28500)),
    bigInt(staffCount("prodigious")).times(getRandomInt(987654, 1234567)),
  ]
  var loot = getRandomInt(2, 6);
  var headCount = [
    "legendary", "transcendent", "archmage", "promethean", "exalted", "prodigious",
  ].map(function (name, index) {
    return staffCount(name) * (index >= 4 && game.upgrades.dark ? 2 : 1);
  }).reduce(function (a, b) {
    return a + b;
  }, 0);
  function addBoost(upgrade, from, n, d) {
    if (game.upgrades[upgrade]) {
      for (var i = from; i < goldEarnings.length; ++i)
        goldEarnings[i] = goldEarnings[i].times(n).divide(d);
    }
    loot *= n / d;
  }
  addBoost("lessons", 2, 3, 2);
  addBoost("bears", 4, 2, 1);
  addBoost("valor", 6, 2, 1);
  addBoost("rank7", 6, 2, 1);
  addBoost("sun", 7, 3, 2);
  addBoost("synergy1", 7, 100 + staffCount("pvpLord"), 100);
  addBoost("sun2", 9, 2, 1);
  addBoost("tc", 0, 6, 2);
  addBoost("empire", 0, 4, 1);
  addBoost("tree", 0, treeRate(), 100);
  addBoost("shadow", 11, 3, 1);
  addBoost("a2f", 12, 5, 1);
  game.gps = goldEarnings.reduce(function (a, b) {
    return a.add(b);
  }, bigInt.zero);
  game.cumulGold += game.gps.mod(20).valueOf();
  game.resources.gold =
    game.resources.gold.add(game.gps.divide(20)).add(Math.floor(game.cumulGold / 20));
  game.cumulGold -= 20 * Math.floor(game.cumulGold / 20);
  if (game.upgrades.goldFarm) {
    game.resources.loot = game.resources.loot.plus(Math.round(loot / 20));
  }
  if (game.upgrades.ww) {
    game.resources.gear = game.resources.gear.plus(Math.floor(0.001 * headCount));
    if (20 * Math.random() < 0.001 * (headCount % 1000)) {
      game.resources.gear =
        game.resources.gear.plus(1 + Math.floor(1.15 * Math.random()));
    }
  }
  var power = staffCount("fanboy");
  var pvpLordPower = 2.8 * staffCount("pvpLord");
  if (game.upgrades.synergy1) pvpLordPower *= (1 + 0.001 * wizardCount());
  power += pvpLordPower;
  recruitAutomatically(power);
}

function littleBrother() {
  var amt = 1;
  if (game.upgrades.critical && Math.random() < 0.1) amt *= 2;
  if (game.upgrades.littleBrother && game.timer % 20 == 0) getXP(amt);
}

function gearCrafting() {
  game.cumulGear += 0.0002 * (game.staff.gearCrafter || 0);
  if (!game.resources.gear || !game.resources.gear.xor)
    game.resources.gear = bigInt.zero;
  game.resources.gear = game.resources.gear.add(Math.floor(game.cumulGear));
  game.cumulGear -= Math.floor(game.cumulGear);
}

function sellLoot() {
  if (game.resources.loot.isZero()) {
    logMessage("You have no loot to sell!");
    return;
  }
  var lv = game.resources.level.toJSNumber();
  var rate = Math.floor(
    lv * (getRandomArbitrary(45, 65) + lv));
  if (game.upgrades.bazaar)
    rate = Math.floor(rate * getRandomArbitrary(1.8, 2.2));
  console.log(rate);
  var worth = game.resources.loot.times(rate);
  if (game.upgrades.empire) worth = worth.times(4);
  logMessage("You sold " + shorten(game.resources.loot) +
    " pieces of loot for " + shorten(worth) + " gold.");
  game.resources.loot = bigInt.zero;
  game.resources.gold = game.resources.gold.plus(worth);
}

function luis() {
  var period = 100;
  if (game.upgrades.runLuis) period /= 2;
  if (game.upgrades.luis && game.timer % period == 0) {
    clickBigButton(true);
  }
}

function resetTrivia() {
  game.special.trivia.timeLeft = 3600 * 20;
  game.special.trivia.left = 10;
}

function tickTriviaCooldowns() {
  if (!game.special.trivia) return;
  game.special.trivia.timeLeft--;
  game.special.trivia.cooldown = Math.max(0, game.special.trivia.cooldown - 1);
  if (game.special.trivia.timeLeft == 0) resetTrivia();
}

function doTrivia() {
  game.special.trivia.left--;
  game.special.trivia.cooldown = 200;
  game.resources.crowns = game.resources.crowns.add(10);
}

function tryTrivia() {
  if (!game.special.trivia) return false;
  if (game.special.trivia.left == 0) return false;
  if (game.special.trivia.cooldown > 0) return false;
  doTrivia();
  return true;
}

function refreshTriviaButtonState() {
  var button = document.getElementById("doTrivia");
  if (game.died) {
    button.innerHTML = "You can't click from the other side!";
    button.setAttribute("disabled", "disabled");
  } else if (!game.special.trivia) {
    button.innerHTML = "???";
    button.setAttribute("disabled", "disabled");
  } else if (game.special.trivia.left == 0) {
    button.innerHTML = beautifyTime(game.special.trivia.timeLeft) +
      " until more trivia";
    button.setAttribute("disabled", "disabled");
  } else if (game.special.trivia.cooldown > 0) {
    button.innerHTML = "Trivia: " + game.special.trivia.left + " left (" +
      beautifyTime(game.special.trivia.cooldown) + ")";
    button.setAttribute("disabled", "disabled");
  } else {
    button.innerHTML = "Trivia: " + game.special.trivia.left + " left";
    button.removeAttribute("disabled");
  }
}

function doAutomaticTrivia() {
  if (game.timer % (3600 * 20 / 10) == 0) {
    var amt = 5 * staffCount("trivia");
    game.resources.crowns = game.resources.crowns.add(amt);
    logMessage("Your trivia monkeys have earned " +
      shorten(amt) + " crowns for you.");
  }
}


var last = Date.now();
var deltas = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];
var i = 0;
var sum = 0;
function tick() {
  if (!game.died || !lastWordsSaid) {
    updatePopulation();
    updateStaff();
    updateUpgrades();
    doStaffBusiness();
    refreshPersuasivePower();
    littleBrother();
    luis();
    tickTriviaCooldowns();
    gearCrafting();
    displayResources();
    refreshLog();
    refreshAutoSaveMessage();
    refreshTriviaButtonState();
    doAutomaticTrivia();
    ++game.timer;
    var now = Date.now();
    var delta = now - last;
    sum += delta - deltas[i];
    deltas[i] = delta;
    i = (i + 1) % deltas.length;
    var tps = deltas.length * 1000 / sum;
    document.getElementById("tps").innerHTML =
      tps.toFixed(2) + "tps";
    last = now;
  }
}

function main() {
  var ver = document.getElementById("version");
  ver.innerHTML = "Clicker101 version " + VERSION + ", written by Uruwi. I am not related to KI.";
  try {
    load();
  } catch (e) {
    console.log(e.message);
    resetGame();
  }
  setInterval(tick, 50);
  setInterval(autoSave, 60000);
}

setTimeout(main, 200);
