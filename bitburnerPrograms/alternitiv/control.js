// controler/control.js

const actions = ['weaken', 'grow', 'hack'];
const scripts = {
  weaken: "basic_threads/weaken.js",
  grow: "basic_threads/grow.js",
  hack: "basic_threads/hack.js"
};

// Modifizierte Hauptfunktion
export async function main(ns) {
  ns.disableLog("ALL");
  ns.enableLog("exec");
  ns.ui.clearTerminal();
  while (true) {
    const profitableServers = findMostProfitableServers(ns);
    const availableServers = findAvailableServers(ns, 1.8); // Mindestens 1.8GB RAM erforderlich
    let executedScripts = [];
    for (let sourceServer of availableServers) {
      const targetServers = profitableServers.map(s => s.server);
      const newScripts = await manageScripts(ns, sourceServer, targetServers);
      executedScripts = executedScripts.concat(newScripts);
    }
    await ns.sleep(250); // Jede Sekunde prüfen
  }
}
async function manageScripts(ns, sourceServer, targetServers) {
  let ramAvailable = ns.getServerMaxRam(sourceServer) - ns.getServerUsedRam(sourceServer);
  if (sourceServer === "home") {
    ramAvailable = Math.max(0, ramAvailable - 64);
  }
  let executedScripts = [];
  while (ramAvailable >= 1.8 && targetServers.length > 0) {
    await ns.sleep(50);
    const targetServer = targetServers.shift(); // Nächsten Zielserver auswählen
    for (let action of actions) {
      if(ns.getHackingLevel() > ns.getHackingLevel(targetServer) && (action == 'hack')){
        continue;
      }
      const scriptRam = ns.getScriptRam(scripts[action], sourceServer);
      const maxThreads = Math.floor(ramAvailable / scriptRam);
      if (maxThreads > 0) {
        const threads = Math.min(maxThreads, 10000); // Maximal 10000 Threads pro Skript
        const pid = ns.exec(scripts[action], sourceServer, threads, targetServer);
        if (pid !== 0) {
          executedScripts.push({ action, threads, pid, sourceServer, targetServer });
          ramAvailable -= scriptRam * threads;
        }
      }
      if (ramAvailable < 1.8) break; // Abbrechen, wenn nicht genug RAM für einen weiteren Thread übrig ist
    }
    if (ramAvailable >= 1.8) {
      targetServers.push(targetServer); // Server wieder ans Ende der Liste anfügen, falls noch RAM übrig ist
    }
  }
  return executedScripts;
}



function evaluateServerProfit(ns, server) {
  const maxMoney = ns.getServerMaxMoney(server);
  const availableMoney = ns.getServerMoneyAvailable(server);
  if (maxMoney === 0) return 0;  // Wenn der Server kein Geld hat, lohnt er sich nicht

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
// Modified findMostProfitableServers function
function findMostProfitableServers(ns) {
  const scannedServers = findAllRootServers(ns);
  let serverProfits = [];

  for (const server of scannedServers) {
    if (ns.hasRootAccess(server) && ns.getServerMaxMoney(server) > 0) {
      const profit = evaluateServerProfit(ns, server);
      serverProfits.push({ server, profit });
    }
  }

  // Sort servers by profit in descending order
  serverProfits.sort((a, b) => b.profit - a.profit);

  return serverProfits;
}

// Hilfsfunktion zum Scannen aller Server
function scanAllServers(ns) {
  let serversToScan = ["home"];
  let scannedServers = [];

  while (serversToScan.length > 0) {
    const server = serversToScan.pop();
    if (!scannedServers.includes(server)) {
      scannedServers.push(server);
      serversToScan = serversToScan.concat(ns.scan(server));
    }
  }
  return scannedServers;
}
function findAllRootServers(ns) {
  const servers = scanAllServers(ns);
  return servers.filter(server => ns.hasRootAccess(server));
}

function findAvailableServers(ns, minRamRequired = 1.8) {
  const servers = findAllRootServers(ns);
  const availableServers = [];

  for (const server of servers) {
    const maxRam = ns.getServerMaxRam(server);
    const usedRam = ns.getServerUsedRam(server);
    let availableRam = maxRam - usedRam;

    // Reserve 32GB on home server
    if (server === "home") {
      availableRam = Math.max(0, availableRam - 70);
    }

    if (availableRam >= minRamRequired) {
      availableServers.push(server);
    }
  }

  return availableServers;
}