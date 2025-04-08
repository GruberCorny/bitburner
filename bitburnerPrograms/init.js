// Skript: mainController.js

class Program{
  /**
   * @type {string}
   */
  script;
  /**
   * @type {number}
   */
  threads;
  /**
   * @type {Array<string>}
   */
  args;
}
/** 
 * @param {NS} ns 
*/
export async function main(ns) {
  ns.ui.clearTerminal();
  // Skripte, die überwacht und ggf. gestartet werden sollen
  /**
   * @type {Array<Program>}
   */
  const programs = [
    { script: "crawler/cracker.js", threads: 1, args: [] },
    { script: "buy/hacknet.js", threads: 1, args: [] },
    { script: "controler/center.js", threads: 1, args: [] },
    { script: "gang/manager.js", threads: 1, args: [] },
    { script: "buy/server.js", threads: 1, args: [] },
    { script: "buy/stock.js", threads: 1, args: [] }
  ];

  while (true) {
    for (let program of programs) {
      // Überprüfe, ob das Programm bereits auf "home" läuft
      if (!ns.scriptRunning(program.script, "home")) {
        if(program.script == "buy/stock.js" && (!ns.stock.hasWSEAccount() || !ns.stock.has4SData() || !ns.stock.has4SDataTIXAPI() || !ns.stock.hasTIXAPIAccess())){
          continue;
        }
        if(program.script == "gang/manager.js" && !ns.gang.inGang()){
          continue;
        }
        // Wenn es nicht läuft, starte es mit der angegebenen Anzahl an Threads und Argumenten
        ns.print(`Starte ${program.script} auf home.`);
        ns.exec(program.script, "home", program.threads, ...program.args);
      }
      await ns.sleep((1000));
    }

    // Warte eine Weile, bevor die Überprüfung wiederholt wird (z.B. 30 Sekunden)
    await ns.sleep((1 * 60 * 1000));
  }
}
