// controler/center.js
import { Logger } from '.././logger/controler/l_center.js';

const scripts = {
  weaken: "basic_threads/weaken.js",
  grow: "basic_threads/grow.js",
  hack: "basic_threads/hack.js"
};

/**
 * @type{number}
 */
const bufferTime = 400; // 200ms buffer between actions
/**
 * @type{number}
 */
const UPDATE_INTERVAL = 5000; // Update every 5 seconds
/**
 * @type{number}
 */
const SCAN_INTERVAL = 2 * 60 * 1000; // Scan servers every 60 seconds
/**
 * @type{number}
 */
const PROFIT_UPDATE_INTERVAL = 2 * 60 * 1000; // Update profit calculations every 60 seconds
/**
 * @type {Object}
 */
let runningScripts;
/**
 * @type {Array}
 */
let pendingScripts;
/**
 * @type {Set}
 */
let targetCooldowns;
/**
 * @type {Set}
 */
let preparedServers;
/**
 * @type {Array}
 */
let cachedServers;
/**
 * @type {Array}
 */
let cachedRootServers;
/**
 * @type {Array}
 */
let cachedProfitableServers;
/**
 * @type {number}
 */
let hackAmount = 0.2;
/**
 * @type {Logger} 
 */
let logger;

/**
 * @param {NS} ns
 */
export async function main(ns) {
  //ns.tail
  ns.disableLog("ALL");

  logger = new Logger(ns, 'info');
  /**
   * @type {number}
   */
  let lastScanTime = 0;
  /**
   * @type {number}
   */
  let lastProfitUpdateTime = 0;

  runningScripts = {};
  pendingScripts = [];
  targetCooldowns = new Set();
  preparedServers = new Set();
  cachedServers = [];
  cachedRootServers = [];
  cachedProfitableServers = [];
  hackAmount = 0.2;

  while (true) {
    const currentTime = Date.now();

    if (currentTime - lastScanTime > SCAN_INTERVAL) {
      logger.debug("Scanning servers");
      cachedServers = scanAllServers(ns);
      cachedRootServers = findAllRootServers(ns);
      lastScanTime = currentTime;
    }

    if (currentTime - lastProfitUpdateTime > PROFIT_UPDATE_INTERVAL) {
      logger.debug("Updating profit calculations");
      cachedProfitableServers = findMostProfitableServers(ns);
      lastProfitUpdateTime = currentTime;
    }

    await updateCycle(ns);
    logProgramState(ns);
    await ns.sleep(500); // Small sleep to prevent game freeze
  }
}

function logProgramState(ns) {
  logger.info("Program State:");
  logger.info(` runningScripts: ${Object.keys(runningScripts).length}`);
  logger.info(` pendingScripts: ${pendingScripts.length}`);
  logger.info(` targetCooldowns: ${targetCooldowns.size}`);
  logger.info(` preparedServers: ${preparedServers.size}`);
  logger.info(` cachedProfitableServers: ${cachedProfitableServers.length}`);
}

async function updateCycle(ns) {
  if (pendingScripts.length > 0) {
    await manageRunningScripts(ns, pendingScripts, cachedRootServers);
  }

  updateRunningScripts(ns, cachedRootServers);
  //updateHackingAmount(ns, cachedProfitableServers);

  let remainingRam = getTotalAvailableRam(ns, cachedRootServers);

  for (let i = 0; i < Math.min(cachedProfitableServers.length, 10) && remainingRam > 0; i++) {
    await ns.sleep(200);
    const target = cachedProfitableServers[i].server;
    if (!preparedServers.has(target)) {
      prepareServer(ns, target, cachedRootServers, remainingRam);
    } else if (canHackServer(ns, target) && !isServerOnCooldown(target)) {
      remainingRam -= managePendingScripts(ns, pendingScripts, target, cachedRootServers, remainingRam);
    }
  }

  if (targetCooldowns.size > 0) {
    removeCooldownsWithoutPendingScripts(ns);
  }
}

function updateHackingAmount(ns, profitableServers) {
  if (preparedServers.size >= profitableServers.length * 0.8) {
    if (hackAmount < 0.6) {
      hackAmount = hackAmount + 0.1;
      preparedServers.clear();
    }
  }
}

function getSkriptMaxRam(ns) {
  return Math.max(ns.getScriptRam(scripts.grow), ns.getScriptRam(scripts.hack), ns.getScriptRam(scripts.weaken));
}

function getTotalAvailableRam(ns, servers) {
  let total = 0;
  for (let server of servers) {
    let availableRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
    if (availableRam < getSkriptMaxRam(ns)) {
      availableRam = 0;
    }
    if (server === "home") {
      availableRam = Math.max(0, availableRam - 32); // Reserve 32GB on home server
    }
    total += availableRam;
  }
  return total;
}

function prepareServer(ns, target, rootAccessServers, totalAvailableRam) {
  logger.debug(`Preparing server: ${target}`);
  const server = ns.getServer(target);
  const player = ns.getPlayer();

  const growTime = ns.formulas.hacking.growTime(server, player);
  const weakenTime = ns.formulas.hacking.weakenTime(server, player);

  const maxMoney = server.moneyMax;
  const minSecurity = server.minDifficulty;

  if (server.moneyAvailable == maxMoney && server.hackDifficulty == minSecurity) {
    preparedServers.add(target);
    return 0;
  }

  let programCycle = [];

  // Get running scripts for this target
  const targetRunningScripts = runningScripts[target] || { hack: 0, grow: 0, weaken: 0 };

  // Calculate the effect of running and pending grow scripts
  const runningGrowThreads = targetRunningScripts.grow || 0;
  const pendingGrowThreads = pendingScripts.reduce((sum, script) =>
    sum + (script.cycle || []).reduce((cycleSum, action) =>
      cycleSum + (Array.isArray(action) && action[2] === 'grow' ? action[1] : 0), 0), 0);
  const totalGrowThreads = runningGrowThreads + pendingGrowThreads;
  const projectedMoney = server.moneyAvailable * Math.pow(ns.formulas.hacking.growPercent(server, 1, player), totalGrowThreads);

  // Calculate the effect of running and pending weaken scripts
  const runningWeakenThreads = targetRunningScripts.weaken || 0;
  const pendingWeakenThreads = pendingScripts.reduce((sum, script) =>
    sum + (script.cycle || []).reduce((cycleSum, action) =>
      cycleSum + (Array.isArray(action) && action[2] === 'weaken' ? action[1] : 0), 0), 0);
  const totalWeakenThreads = runningWeakenThreads + pendingWeakenThreads;
  const projectedSecurity = server.hackDifficulty - (totalWeakenThreads * 0.05);
  if (projectedMoney < maxMoney || projectedSecurity > minSecurity) {
    // Server needs to be prepared
    if (projectedMoney == 0 || maxMoney / projectedMoney == Infinity || maxMoney == 0 || maxMoney / projectedMoney == 0) {
      return -1;
    }
    let growThreads = Math.ceil(ns.formulas.hacking.growThreads(server, player, maxMoney));
    const growSecurity = ns.hackAnalyzeSecurity(growThreads, target);
    let weakenThreads = Math.ceil((projectedSecurity + growSecurity - minSecurity) / 0.05);

    // Calculate start times to finish in the correct order with buffer time
    const finishTime = Math.max(weakenTime, growTime) + 2 * bufferTime;
    const weakenStart = finishTime - weakenTime - 0 * bufferTime;
    const growStart = finishTime - growTime - 1 * bufferTime;

    while (calculateCycleRam(ns, [[0, growThreads, 'grow'], [0, weakenThreads, 'weaken']]) > totalAvailableRam) {
      const reductionFactor = 0.8;
      weakenThreads = Math.max(1, Math.floor(weakenThreads * reductionFactor));
      growThreads = Math.max(1, Math.floor(growThreads * reductionFactor));
    }

    const growProgram = [weakenStart, growThreads, 'grow'];
    const weakenProgram = [growStart, weakenThreads, 'weaken'];

    programCycle = [growProgram, weakenProgram];

    pendingScripts.push({
      cycle: programCycle,
      startTime: Date.now(),
      prepare: true,
      target: target
    });
  }
  return 0;
}

function isServerOnCooldown(target) {
  return targetCooldowns.has(target);
}

function setServerCooldown(target) {
  targetCooldowns.add(target);
}

function removeServerCooldown(target) {
  targetCooldowns.delete(target);
}


function removeCooldownsWithoutPendingScripts(ns) {
  for (let target of targetCooldowns) {
    const isPending = pendingScripts.some(script => script.target === target);
    if (!isPending) {
      removeServerCooldown(target);
    }
  }
}

async function executeDistributedScript(ns, action, target, rootAccessServers, totalThreadsNeeded) {
  const scriptRam = ns.getScriptRam(scripts[action]);
  let threadsRemaining = totalThreadsNeeded;
  while (threadsRemaining > 0) {
    for (let server of rootAccessServers) {
      if (threadsRemaining <= 0) {
        break;
      }

      let serverRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
      if (server === "home") {
        serverRam = Math.max(0, serverRam - 32);
      }
      const maxThreads = Math.floor(serverRam / scriptRam);
      const threadsToUse = Math.min(maxThreads, threadsRemaining);
      if (threadsToUse > 0) {
        const pid = ns.exec(scripts[action], server, threadsToUse, target);
        if (pid !== 0) {
          threadsRemaining -= threadsToUse;
        }
      }
    }
    if (threadsRemaining <= 0) {
      break;
    }
    await ns.sleep(1000);
  }
}


function canHackServer(ns, target) {
  return ns.hasRootAccess(target) && ns.getHackingLevel("home") >= ns.getServerRequiredHackingLevel(target);
}

function updateRunningScripts(ns, rootAccessServers) {
  for (let server of rootAccessServers) {
    const processes = ns.ps(server);
    for (let process of processes) {
      if (scripts[process.filename]) {
        const action = Object.keys(scripts).find(key => scripts[key] === process.filename);
        const target = process.args[0];
        if (!runningScripts[target]) {
          runningScripts[target] = { hack: 0, grow: 0, weaken: 0 };
        }
        runningScripts[target][action] += process.threads;
      }
    }
  }
}

function managePendingScripts(ns, pendingScripts, target, rootAccessServers, totalAvailableRam) {
  logger.debug(`Managing pending scripts for target: ${target}`);
  const server = ns.getServer(target);
  const player = ns.getPlayer();

  const hackTime = ns.formulas.hacking.hackTime(server, player);
  const growTime = ns.formulas.hacking.growTime(server, player);
  const weakenTime = ns.formulas.hacking.weakenTime(server, player);

  const maxMoney = server.moneyMax;
  const minSecurity = server.minDifficulty;
  let programCycle = [];
  // Server is prepared, proceed with hack cycle

  let hackThreads = Math.ceil(ns.formulas.hacking.hackPercent(server, player) * hackAmount);

  const securityAfterHack = minSecurity + ns.hackAnalyzeSecurity(hackThreads, target);
  let weakenThreadsOne = Math.ceil((securityAfterHack - minSecurity) / 0.05);

  const moneyAfterHack = maxMoney * (1 - hackAmount);
  const numberGrowths = maxMoney / moneyAfterHack;
  if (numberGrowths == 0 || numberGrowths == Infinity || moneyAfterHack == 0 || maxMoney == 0) {
    return 0;
  }
  let growThreads = Math.ceil(ns.formulas.hacking.growThreads(server, player, maxMoney, 1));

  const securityAfterGrow = securityAfterHack + ns.growthAnalyzeSecurity(growThreads, target);
  let weakenThreadsTwo = Math.ceil((securityAfterGrow - minSecurity) / 0.05);

  const hackProgram = [0, hackThreads, 'hack'];
  const weakenProgramOne = [0, weakenThreadsOne, 'weaken'];
  const growProgram = [0, growThreads, 'grow'];
  const weakenProgramTwo = [0, weakenThreadsTwo, 'weaken'];

  programCycle = [hackProgram, weakenProgramOne, growProgram, weakenProgramTwo];

  while (calculateCycleRam(ns, [[0, hackThreads, 'hack'], [0, weakenThreadsOne, 'weaken'], [0, growThreads, 'grow'], [0, weakenThreadsTwo, 'weaken']]) > totalAvailableRam) {
    const reductionFactor = 0.8;
    hackThreads = Math.max(1, Math.floor(hackThreads * reductionFactor));
    weakenThreadsOne = Math.max(1, Math.floor(weakenThreadsOne * reductionFactor));
    growThreads = Math.max(1, Math.floor(growThreads * reductionFactor));
    weakenThreadsTwo = Math.max(1, Math.floor(weakenThreadsTwo * reductionFactor));
  }

  // Calculate start times to finish in the correct order with buffer time
  const finishTime = Math.max(weakenTime, growTime, hackTime) + 4 * bufferTime;
  const hackStart = finishTime - hackTime - 3 * bufferTime;
  const weakenOneStart = finishTime - weakenTime - 2 * bufferTime;
  const growStart = finishTime - growTime - 1 * bufferTime;
  const weakenTwoStart = finishTime - weakenTime - 0 * bufferTime;

  programCycle = [
    [hackStart, hackThreads, 'hack'],
    [weakenOneStart, weakenThreadsOne, 'weaken'],
    [growStart, growThreads, 'grow'],
    [weakenTwoStart, weakenThreadsTwo, 'weaken']
  ];

  pendingScripts.push({
    cycle: programCycle,
    startTime: Date.now(),
    prepare: false,
    target: target
  });

  setServerCooldown(target);
  if (programCycle == undefined) {
    return 0;
  }
  return calculateCycleRam(ns, programCycle);
}

// Helper function to calculate the total RAM required a cycle
function calculateCycleRam(ns, cycle) {
  let total = 0;
  for (let program of cycle) {
    if (program == undefined || !program.isArray || (cycle == undefined || !cycle.isArray)) {
      return 0;
    }
    total += (ns.getScriptRam(scripts[program[2]]) * program[1])
  }
}

/**
 * @param {Object} ns
 * @returns {Promise<number>} 
 */
async function manageRunningScripts(ns, pendingScripts, rootAccessServers) {
  // Check pending scripts and start them if it's time
  for (let i = 0; i < pendingScripts.length; i++) {
    await ns.sleep(400);
    const currentTime = Date.now();
    const pendingScript = pendingScripts[i];
    // Check if pendingScript or its properties are undefined
    if (!pendingScript || typeof pendingScript !== 'object') {
      // Remove invalid pendingScript and continue to next iteration
      pendingScripts.splice(i, 1);
      i--; // Adjust index since we removed an element
      continue;
    }
    const cycle = pendingScript.cycle;
    const startTime = pendingScript.startTime;
    const prepare = pendingScript.prepare;
    const target = pendingScript.target;
    if (!Array.isArray(cycle) || cycle.length === 0 || cycle == undefined || cycle[0] == undefined) {
      // Remove invalid pendingScript and continue to next iteration
      pendingScripts.splice(i, 1);
      i--; // Adjust index since we removed an element
      continue;
    }
    const [delay, threads, action] = cycle[0];
    if (typeof delay === 'number' && typeof threads === 'number' &&
      typeof action === 'string') {
      if (currentTime >= startTime + delay) {
        await executeDistributedScript(ns, action, target, rootAccessServers, threads);
        cycle.shift(); // Remove this action from the cycle

        // Update the start time the next action in the cycle
        if (cycle.length > 0) {
          pendingScript.startTime = currentTime + bufferTime;
        }
      }
    }
    if (cycle.length === 0) {
      if (prepare) {
        preparedServers.add(target);
      }
      // All actions in this cycle have been started, remove it from pending
      pendingScripts.splice(i, 1);
      i--; // Adjust index since we removed an element
    }
  }

  return 0;
}

function evaluateServerProfit(ns, server) {
  const serverObj = ns.getServer(server);
  const player = ns.getPlayer();

  const maxMoney = serverObj.moneyMax;
  const availableMoney = serverObj.moneyAvailable;
  if (maxMoney == 0 || availableMoney == 0) return 0;  // If the server has no money, it's not profitable

  const hackChance = ns.formulas.hacking.hackChance(serverObj, player);
  const hackAmountPercent = ns.formulas.hacking.hackPercent(serverObj, player);
  const growTime = ns.formulas.hacking.growTime(serverObj, player);
  const serverGrowth = serverObj.serverGrowth;
  const weakenTime = ns.formulas.hacking.weakenTime(serverObj, player);
  const weakenAmount = 0.05;
  const hackTime = ns.formulas.hacking.hackTime(serverObj, player);
  let hackThreads = 1;
  let growThreads = 1;

  // Calculate the profit from hacking
  const hackMoney = availableMoney * 0.95 * hackAmountPercent * hackChance;
  // Calculate money growth per second
  const growMoneyPerSec = (maxMoney * 0.95) * (1 + (serverGrowth / 100)) / growTime;
  // Time needed to grow back to the hacked value
  const growMoneyTimeNeed = hackMoney / growMoneyPerSec;
  // Calculate security increase
  const securityInc = 0.002 * hackThreads + 0.004 * growThreads;
  // Time needed to weaken security back to the previous level
  const securityTimeNeed = securityInc / (weakenAmount / weakenTime);
  // Cycle time: time for growth, weakening, and hacking
  const cycleTime = (growMoneyTimeNeed + securityTimeNeed + hackTime);

  // Potential profit per second
  const potentialProfitPerSec = hackMoney / cycleTime;

  return potentialProfitPerSec;
}
/*
function evaluateServerProfit(ns, server) {
  const maxMoney = ns.getServerMaxMoney(server);
  const availableMoney = ns.getServerMoneyAvailable(server);
  if (maxMoney == 0 || availableMoney == 0) return 0;  // Wenn der Server kein Geld hat, lohnt er sich nicht

  const hackChance = ns.hackAnalyzeChance(server);
  const hackAmountProzent = ns.hackAnalyze(server);
  const growtime = ns.getGrowTime(server);
  const servergrowth = ns.getServerGrowth(server);
  const growthanalyzesecurity = ns.growthAnalyzeSecurity(1, server, 1);
  const weakentime = ns.getWeakenTime(server);
  const weakenValue = 0.05;
  const hacktime = ns.getHackTime(server);
  const hackanalyzesecurity = ns.hackAnalyzeSecurity(1, server);

  // Berechne den Gewinn durch Hacking
  const hackmoney = (((availableMoney * 0.95) * hackAmountProzent) * hackChance);
  // Berechne das Geldwachstum pro Sekunde
  const growmoneypersec = (maxMoney * 0.95) * (1 + (servergrowth / 100)) / growtime;
  // Zeit, die benötigt wird, um durch Wachstum den Hackwert zu erreichen
  const growmoneytimeneed = hackmoney / growmoneypersec;
  // Berechne den Sicherheitszuwachs
  const securityinc = hackanalyzesecurity + growthanalyzesecurity;
  // Zeit, um die Sicherheit auf das vorherige Niveau zu schwächen
  const securitytimeneed = securityinc / (weakenValue / weakentime);
  // Zykluszeit: Zeit für Wachstum, Schwächung und Hacken
  const cykeltime = (growmoneytimeneed + securitytimeneed + hacktime);

  // Potenzieller Gewinn pro Sekunde
  const potentialProfitPerSec = hackmoney / cykeltime;

  return potentialProfitPerSec;
}
*/

function findMostProfitableServers(ns) {
  logger.debug("Finding most profitable servers");
  let serverProfits = [];

  for (const server of cachedServers) {
    if (ns.hasRootAccess(server) && ns.getServerMaxMoney(server) > 0 && ns.getHackingLevel() >= ns.getServerRequiredHackingLevel(server)) {
      const profit = evaluateServerProfit(ns, server);
      if (profit == 0) continue;
      serverProfits.push({ server, profit });
    }
  }

  serverProfits.sort((a, b) => b.profit - a.profit);
  return serverProfits;
}

function scanAllServers(ns) {
  logger.debug("Scanning all servers");
  let serversToScan = ["home"];
  let scannedServers = new Set();

  while (serversToScan.length > 0) {
    const server = serversToScan.pop();
    if (!scannedServers.has(server)) {
      scannedServers.add(server);
      serversToScan = serversToScan.concat(ns.scan(server));
    }
  }
  return Array.from(scannedServers);
}


function findAllRootServers(ns) {
  logger.debug("Finding all root servers");
  return cachedServers.filter(server => ns.hasRootAccess(server));
}