/** @param {NS} ns **/
export async function main(ns) {
  const serverManager = new ServerManager(ns);

  while (true) {
    await serverManager.buyAndUpgradeServers();
    await ns.sleep(10 * 1000); // Wait 10 seconds between cycles
  }
}
/**
 * 
 */
class ServerManager {
  /**
   * @constructor
   * @param {NS} ns
   * @returns @this
   */
  constructor(ns) {
    /**
     * @property {NS} ns
     */
    this.ns = ns;
    /**
     * @property {number} maxServers
     */
    this.maxServers = ns.getPurchasedServerLimit();
    /**
     * @property {number} maxRam
     */
    this.maxRam = ns.getPurchasedServerMaxRam();
  }

  getOptimalServerRam() {
    const playerMoney = this.ns.getServerMoneyAvailable("home") / 4;
    let optimalRam = 2;

    while (optimalRam * 2 <= this.maxRam && this.ns.getPurchasedServerCost(optimalRam * 2) <= playerMoney) {
      optimalRam *= 2;
    }

    return optimalRam;
  }

  async buyAndUpgradeServers() {
    const currentServers = this.ns.getPurchasedServers();

    // Buy new servers if possible
    await this.buyNewServers(currentServers);

    // Upgrade existing servers
    await this.upgradeExistingServers(currentServers);
  }

  async buyNewServers(currentServers) {
    while (currentServers.length < this.maxServers) {
      const ram = this.getOptimalServerRam();
      const cost = this.ns.getPurchasedServerCost(ram);

      if (this.ns.getServerMoneyAvailable("home") / 4 >= cost) {
        const serverName = `pserv-${currentServers.length}`;
        await this.waitTillCash(cost);
        this.ns.purchaseServer(serverName, ram);
        this.ns.print(`Purchased new server: ${serverName} with ${ram}GB RAM`);
        currentServers.push(serverName);
      } else {
        break;
      }
      await this.ns.sleep(1000);
    }
  }

  async upgradeExistingServers(currentServers) {
    for (const server of currentServers) {
      const currentRam = this.ns.getServerMaxRam(server);
      const optimalRam = this.getOptimalServerRam();

      if (currentRam < optimalRam) {
        const upgradeCost = this.ns.getPurchasedServerUpgradeCost(server, optimalRam);
        if (this.ns.getServerMoneyAvailable("home") / 4 >= upgradeCost) {
          await this.waitTillCash(upgradeCost);
          this.ns.upgradePurchasedServer(server, optimalRam);
          this.ns.print(`Upgraded server: ${server} to ${optimalRam}GB RAM`);
        }
      }
    }
  }

  async waitTillCash(target) {
    while (this.ns.getServerMoneyAvailable("home") / 4 < target) {
      await this.ns.sleep(20 * 1000);
    }
  }

  calculateServerValue(ram) {
    // Calculate the value of a server based on its RAM and the player's hacking skill
    const player = this.ns.getPlayer();
    const hackingPower = this.ns.formulas.hacking.hackingPower(player);
    return ram * Math.log2(hackingPower + 1);
  }

  findMostValuableUpgrade(currentServers) {
    let bestUpgrade = null;
    let bestValue = 0;

    for (const server of currentServers) {
      const currentRam = this.ns.getServerMaxRam(server);
      const optimalRam = this.getOptimalServerRam();

      if (currentRam < optimalRam) {
        const upgradeCost = this.ns.getPurchasedServerUpgradeCost(server, optimalRam);
        const valueIncrease = this.calculateServerValue(optimalRam) - this.calculateServerValue(currentRam);
        const upgradeValue = valueIncrease / upgradeCost;

        if (upgradeValue > bestValue) {
          bestValue = upgradeValue;
          bestUpgrade = { server, ram: optimalRam, cost: upgradeCost };
        }
      }
    }

    return bestUpgrade;
  }
}