/** @param {NS} ns */
export async function main(ns) {

    // Funktion zum Scannen aller erreichbaren Server
    function scanAllServers(ns) {
        let servers = ['home'];
        for (let i = 0; i < servers.length; i++) {
            let newServers = ns.scan(servers[i]);
            for (let j = 0; j < newServers.length; j++) {
                if (!servers.includes(newServers[j])) {
                    servers.push(newServers[j]);
                }
            }
        }
        return servers;
    }

    // Hauptprogramm
    let allServers = scanAllServers(ns);
    for (let server of allServers) {
        if (server === 'home') continue;

        let requiredHackingLevel = ns.getServerRequiredHackingLevel(server);
        let currentHackingLevel = ns.getHackingLevel();
        let numPortsRequired = ns.getServerNumPortsRequired(server);
        let openPorts = 0;

        // Überprüfen und öffnen von Ports
        if (ns.fileExists("BruteSSH.exe", "home")) {
            ns.brutessh(server);
            openPorts++;
        }
        if (ns.fileExists("FTPCrack.exe", "home")) {
            ns.ftpcrack(server);
            openPorts++;
        }
        if (ns.fileExists("relaySMTP.exe", "home")) {
            ns.relaysmtp(server);
            openPorts++;
        }
        if (ns.fileExists("HTTPWorm.exe", "home")) {
            ns.httpworm(server);
            openPorts++;
        }
        if (ns.fileExists("SQLInject.exe", "home")) {
            ns.sqlinject(server);
            openPorts++;
        }

        // Versuchen, Root-Zugriff zu erlangen
        if (openPorts >= numPortsRequired) {
            ns.nuke(server);
        }

        // Überprüfen, ob wir Backdoor installieren können
        if (ns.hasRootAccess(server) && currentHackingLevel >= requiredHackingLevel) {
            if (!ns.getServer(server).backdoorInstalled) {
                try {
                    await ns.singularity.connect(server);
                    await ns.singularity.installBackdoor();
                    ns.tprint(`Backdoor erfolgreich auf ${server} installiert.`);
                    await ns.singularity.connect("home");
                } catch (error) {
                    ns.tprint(`Fehler beim Installieren der Backdoor auf ${server}: ${error}`);
                }
            } else {
                ns.tprint(`Backdoor bereits auf ${server} installiert.`);
            }
        } else {
            ns.tprint(`Kann keine Backdoor auf ${server} installieren. Bedingungen nicht erfüllt.`);
        }
    }
}