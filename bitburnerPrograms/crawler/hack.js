/** @param {NS} ns **/
export async function main(ns) {
    // Das Skript, das auf allen Servern ausgeführt werden soll
    const scriptToRun = "smart/hwg.js";  // Ersetze dies durch den Namen deines Hauptprogramms
    const scriptRAM = ns.getScriptRam(scriptToRun);
    
    // Finde alle Server
    const servers = scanAllServers(ns);

    // Führe das Programm auf jedem Server aus, auf dem Root-Zugriff besteht und genügend RAM vorhanden ist
    for (const server of servers) {
        if (ns.hasRootAccess(server) && ns.getServerMaxRam(server) >= scriptRAM) {
            
            // Kopiere das Skript auf den Server, wenn es nicht bereits vorhanden ist
            ns.scp(scriptToRun, server);

            // Berechne, wie viele Threads du auf diesem Server ausführen kannst
            const availableRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
            const threads = Math.floor(availableRam / scriptRAM);

            if (threads > 0) {
                ns.exec(scriptToRun, server, threads);
            }
        }
    }
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
