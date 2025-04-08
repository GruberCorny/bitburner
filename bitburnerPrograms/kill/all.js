// Skript: killAllOnAllServers.js
/** @param {NS} ns **/
export async function main(ns) {
    // Alle Server, die du kontrollierst, holen
    let servers = scanAllServers(ns);
    
    for (let server of servers) {
        // Beendet alle Skripte auf dem Server
        ns.killall(server);
        ns.tprint(`Alle Skripte auf dem Server '${server}' wurden beendet.`);
    }
    ns.ui.clearTerminal();
}

// Funktion zum Scannen aller erreichbaren Server
function scanAllServers(ns) {
    let allServers = ["home"];  // Startpunkt
    let seenServers = new Set(allServers);
    
    for (let i = 0; i < allServers.length; i++) {
        let currentServer = allServers[i];
        let foundServers = ns.scan(currentServer);
        
        for (let server of foundServers) {
            if (!seenServers.has(server)) {
                seenServers.add(server);
                allServers.push(server);
            }
        }
    }
    
    return allServers;
}
