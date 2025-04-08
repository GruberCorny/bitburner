/** @param {NS} ns */
export async function main(ns) {
  ns.print(Date.now());
    var target_server = ns.args[0];
    await ns.weaken(target_server);
    
}