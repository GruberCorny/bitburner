/** @param {NS} ns **/
export async function main(ns) {
    // Liste aller Server ermitteln
    const servers = scanAllServers(ns);

    // Alle Server durchlaufen und Skripte stoppen
    for (const server of servers) {
        if (server !== "home") { // Ignoriere den "home"-Server
            const runningScripts = ns.ps(server); // Liste aller laufenden Skripte auf dem Server
            for (const script of runningScripts) {
                ns.scriptKill(script.filename, server); // Skript stoppen
            }
            
        }
    }
    ns.tprint(`Alle Skripte auf Servern gestoppt.`);
}

// Hilfsfunktion, um alle Server zu scannen
function scanAllServers(ns) {
    const servers = [];
    const queue = ["home"];
    const visited = new Set(["home"]);

    while (queue.length > 0) {
        const server = queue.shift();
        servers.push(server);

        // Nachbarn scannen und der Queue hinzufügen
        const neighbors = ns.scan(server);
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
            }
        }
    }
    return servers;
}
