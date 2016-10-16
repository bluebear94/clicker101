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
  var residue = power % cls;
  if (cls > pcOfLast) {
    return shorten(ns.slice(0, ns.length - 3 * pcOfLast)) +
      " " + words[words.length - 1];
  } else {
    var left = ns.slice(0, residue + 1);
    var right = ns.slice(residue + 1, 6);
    return left + "." + right + " " + words[cls - 2];
  }
}

// Thanks http://stackoverflow.com/a/196991/3130218
function toTitleCase(str) {
  if (str === undefined) return "uNDEFINED";
  return str.replace(/\w\S*/g, function(txt){ return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
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
  newGame = game;
  var gameStr = localStorage.getItem("Clicker101SaveData");
  game = desubstSafe(JSON.parse(gameStr));
  merge(game, newGame);
  for (var key in game.staffPrice) {
    var amt = game.staff[key];
    game.staffPrice[key] = increase(baseStaffPrices[key], amt);
  }
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
    msgLog = msgLog.concat(iMsgLog.reverse());
    iMsgLog = [];
    if (msgLog.length >= 2 * MAX_LOG_ENTRIES) {
      msgLog = msgLog.slice(MAX_LOG_ENTRIES);
    }
    var recentMessages = msgLog.slice(
      Math.max(0, msgLog.length - MAX_LOG_ENTRIES));
    var box = document.getElementById("msglog");
    box.innerHTML = recentMessages.reverse().join('\r\n');
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
  game.timer = 0;
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
  grandmaster: true
};
function wizardMinimum(u) {
  return function() {
    var c = 0;
    for (var key in wizardClasses) {
      c += game.staff[key] || 0;
    }
    return c >= u;
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

function neededToString(needed) {
  if (!needed.length) return "NOTHING";
  if (needed.length == 1)
    return resourceNames[needed[0]];
  if (needed.length == 2)
    return resourceNames[needed[0]] + " or " + resourceNames[needed[1]];
  var realNames = neeeded.map(function (nm) { return resourceNames[nm]; });
  return realNames.slice(0, needed.length - 1).join(", ") +
    ", or " + resourceNames[needed[needed.length - 1]];
}

function buyStaffVerbose(name) {
  var needed = buyStaff(name);
  logMessage(needed.length == 0 ?
    "You successfully purchased " + attachA(staffNames[name]) + "." :
    "You don't have enough " + neededToString(needed) + ".");
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
};

var upgradeDescriptions = {
  socialMedia: "Your recruiting spreads quickly, and <b>recruiting is 10 times more effective.</b>",
  test: "Clicking gives <b>2 more gold.</b>",
  bears: "You establish trade with the bears, so <b>you and adept or higher wizards collect twice as much gold.</b>",
  littleBrother: "Your little brother starts playing the game. He's not very good, but he collects <b>1 XP per second</b> for you.",
  questStack: "You quest more efficiently; <b>clicking yields 50% more experience.</b>",
  lessons: "Our favorite anthropomorphic horses offers you a lesson in combat; <b>you and initiate or higher wizards collect 50% more gold.</b>",
  party: "With a team, you can complete dungeons faster. <b>Getting boss drops from clicking is twice as likely.</b>",
  arena: "<b>The game shouldn't die as quickly.</b> (Unlike what SkythekidRS suggests, the arena is <i>not</i> lined with butter.)",
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
};

function reposition(elem, x, y) {
  elem.style.top = y + 5;
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
    "You need more " + neededToString(needed) + ".");
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

function onDeath() {
  var bigButton = document.getElementById("thebutton");
  bigButton.setAttribute("disabled", "disabled");
  bigButton.innerHTML = "You can't click from the other side!";
  var recButton = document.getElementById("recruit");
  recButton.setAttribute("disabled", "disabled");
  recButton.innerHTML = "You can't click from the other side!";
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
  var bigButton = document.getElementById("thebutton");
  bigButton.removeAttribute("disabled");
  bigButton.innerHTML = "Click to farm";
  var recButton = document.getElementById("recruit");
  recButton.removeAttribute("disabled");
  recButton.innerHTML = "Recruit";
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

function clickBigButton() {
  var gold = Math.floor(
    getRandomArbitrary(0, 4) +
    getRandomArbitrary(1.5, 2.5) * game.resources.level
  );
  if (game.upgrades.lessons) gold = Math.floor(gold * 1.5);
  if (game.upgrades.bears) gold *= 2;
  if (game.upgrades.test) gold += 2;
  var xp =
    3 * Math.floor(getRandomInt(1, 5) + 1.2 * Math.sqrt(game.resources.level));
  if (game.upgrades.questStack) xp = Math.floor(xp * 1.5);
  if (Math.random() < 0.05 * (game.upgrades.party ? 2 : 1)) {
    gold = Math.floor(gold * getRandomArbitrary(4, 8));
    xp = Math.floor(xp * getRandomArbitrary(2, 4));
  }
  game.resources.gold = game.resources.gold.add(gold);
  logMessage("You received " + gold + " gold!");
  getXP(xp);
  logMessage("You received " + xp + " experience!");
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

function recruit() {
  var upTo = 2 + 0.01 * game.hres.pp;
  if (game.upgrades.socialMedia) upTo *= 10;
  var players = Math.floor(upTo * Math.random());
  game.resources.activePlayers = game.resources.activePlayers.add(players);
  if (players == 0) logMessage("Bummer! You fail to recruit any players.");
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
  return res;
}
function refreshPersuasivePower() {
  if (game.hres.pp >= 100 + game.resources.level || getRandomInt(0, 100) > 0)
    return;
  game.hres.pp = Math.min(100, game.hres.pp + getRandomInt(1, 3));
  if (getRandomArbitrary(0, 10000) < (game.hres.agr - game.hres.bagr)) {
    logMessage("The euphoria subsides...");
    game.hres.agr--;
  }
}

function recruitAutomatically(power) {
  var players = getRandomArbitrary(0, power / 40) + getRandomArbitrary(0, power / 40);
  if (game.upgrades.socialMedia) players *= 10;
  players = Math.ceil(players);
  game.resources.activePlayers = game.resources.activePlayers.add(players);
  if (getRandomInt(0, 20000) < Math.min(power, 1000)) {
    logMessage("You feel that the game is becoming more popular.");
    game.hres.agr += 1;
  }
}

function doStaffBusiness() {
  var goldEarnings = [
    staffCount("novice") * getRandomArbitrary(0.1, 1),
    staffCount("apprentice") * getRandomArbitrary(0.5, 4),
    staffCount("initiate") * getRandomArbitrary(2, 6),
    staffCount("journeyman") * getRandomArbitrary(4, 9),
    staffCount("adept") * getRandomArbitrary(10, 20),
    staffCount("magus") * getRandomArbitrary(25, 35),
    staffCount("master") * getRandomArbitrary(40, 65),
    staffCount("grandmaster") * getRandomArbitrary(100, 135),
  ]
  function addBoost(upgrade, from, by) {
    if (game.upgrades[upgrade]) {
      for (var i = from; i < goldEarnings.length; ++i) goldEarnings[i] *= by;
    }
  }
  addBoost("lessons", 2, 1.5);
  addBoost("bears", 4, 2);
  game.cumulGold += goldEarnings.reduce(function (a, b) {
    return a + b;
  }, 0) / 20;
  game.resources.gold = game.resources.gold.add(Math.floor(game.cumulGold));
  game.cumulGold -= Math.floor(game.cumulGold);
  recruitAutomatically(staffCount("fanboy"));
}

function littleBrother() {
  if (game.upgrades.littleBrother && game.timer % 20 == 0) getXP(1);
}

function tick() {
  if (!game.died || !lastWordsSaid) {
    updatePopulation();
    updateStaff();
    updateUpgrades();
    doStaffBusiness();
    refreshPersuasivePower();
    littleBrother();
    displayResources();
    refreshLog();
    refreshAutoSaveMessage();
    ++game.timer;
  }
}

function main() {
  resetGame();
  setInterval(tick, 50);
  setInterval(autoSave, 60000);
}

setTimeout(main, 200);
