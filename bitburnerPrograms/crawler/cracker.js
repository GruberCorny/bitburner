/** @param {NS} ns **/

// Funktion zum Knacken eines einzelnen Servers
async function crackServer(ns, server) {
  const scripts = ["basic_threads/hack.js", "basic_threads/grow.js", "basic_threads/weaken.js"];
  for (const script of scripts) {
      copyScriptToServer(ns, script, server);
  }
  if (ns.hasRootAccess(server)) {
    return;
  }

  // Versuche, Ports zu öffnen
  var portsOpen = 0;
  if (ns.fileExists("BruteSSH.exe", "home")) { ns.brutessh(server); portsOpen++; }
  if (ns.fileExists("FTPCrack.exe", "home")) { ns.ftpcrack(server); portsOpen++; }
  if (ns.fileExists("RelaySMTP.exe", "home")) { ns.relaysmtp(server); portsOpen++; }
  if (ns.fileExists("HTTPWorm.exe", "home")) { ns.httpworm(server); portsOpen++; }
  if (ns.fileExists("SQLInject.exe", "home")) { ns.sqlinject(server); portsOpen++; }
  
  // Versuche, Root-Zugriff zu erhalten
  if (ns.getServerNumPortsRequired(server) <= portsOpen) {
    ns.nuke(server);
  }
}

// Funktion zum Scannen aller Server
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

// Hauptfunktion zum Knacken aller Server
export async function main(ns) {
  const servers = scanAllServers(ns);

  for (const server of servers) {
    await crackServer(ns, server);
  }
}

// Funktion zum Kopieren eines Skripts auf einen Server
function copyScriptToServer(ns, scriptName, server) {
  if (!ns.fileExists(scriptName, "home")) {
    ns.print(`Fehler: Das Skript ${scriptName} existiert nicht auf home.`);
    return;
  }
  ns.scp(scriptName, server);
}
