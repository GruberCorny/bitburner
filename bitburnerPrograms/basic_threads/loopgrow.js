/** @param {NS} ns */
export async function main(ns) {
    var target_server = ns.args[0];
    while(true){
    await ns.grow(target_server);
    }
}