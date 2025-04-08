/** @param {NS} ns **/
export async function main(ns) {
  const hacknetManager = new HacknetManager(ns);
  const serverManager = new ServerManager(ns);

  while (true) {
    await ns.sleep(100);
    await hacknetManager.optimize();
    await serverManager.buyAndUpgradeServers();
  }
}

class HacknetManager {
  constructor(ns) {
    this.ns = ns;
    this.breakevenTime = 7200; // Erhöht auf 2 Stunden für aggressiveres Investieren
    this.gainMul = this.calculateGainMultiplier();
    this.minPurchaseThreshold = 0.1; // Kaufe Upgrades, wenn sie 10% des verfügbaren Geldes kosten
  }

  calculateGainMultiplier() {
    let multi = 1;
    try {
      multi = this.ns.getBitNodeMultipliers().HacknetNodeMoney;
    } catch (err) { }
    return this.ns.getHacknetMultipliers().production * multi;
  }

  gainFromLevelUpgrade(X, Y, Z) {
    return (1 * 1.6) * Math.pow(1.035, Y - 1) * ((Z + 5) / 6);
  }

  gainFromRamUpgrade(X, Y, Z) {
    return (X * 1.6) * (Math.pow(1.035, (2 * Y) - 1) - Math.pow(1.035, Y - 1)) * ((Z + 5) / 6);
  }

  gainFromCoreUpgrade(X, Y, Z) {
    return (X * 1.6) * Math.pow(1.035, Y - 1) * (1 / 6);
  }

  findWeakestNode() {
    let weakestIndex = 0;
    let weakestProduction = Infinity;
    
    for (let i = 0; i < this.ns.hacknet.numNodes(); i++) {
      const production = this.ns.hacknet.getNodeStats(i).production;
      if (production < weakestProduction) {
        weakestProduction = production;
        weakestIndex = i;
      }
    }
    
    return weakestIndex;
  }

  async optimizeNode(nodeIndex) {
    const node = this.ns.hacknet.getNodeStats(nodeIndex);
    const playerMoney = this.ns.getServerMoneyAvailable("home");
    const options = [
      { type: 'L', cost: this.ns.hacknet.getLevelUpgradeCost(nodeIndex, 1), gain: this.gainFromLevelUpgrade(node.level, node.ram, node.cores) },
      { type: 'R', cost: this.ns.hacknet.getRamUpgradeCost(nodeIndex, 1), gain: this.gainFromRamUpgrade(node.level, node.ram, node.cores) },
      { type: 'C', cost: this.ns.hacknet.getCoreUpgradeCost(nodeIndex, 1), gain: this.gainFromCoreUpgrade(node.level, node.ram, node.cores) },
      { type: 'N', cost: this.ns.hacknet.getPurchaseNodeCost(), gain: node.production }
    ];

    const viableOptions = options.filter(option => option.cost <= playerMoney * this.minPurchaseThreshold);

    if (viableOptions.length === 0) return false;

    const bestOption = viableOptions.reduce((best, current) => {
      const breakeven = current.cost / (this.gainMul * current.gain);
      return breakeven < best.breakeven ? { ...current, breakeven } : best;
    }, { breakeven: this.breakevenTime });

    if (bestOption.breakeven < this.breakevenTime) {
      await this.waitTillCash(bestOption.cost);
      switch (bestOption.type) {
        case 'L': this.ns.hacknet.upgradeLevel(nodeIndex, 1); break;
        case 'R': this.ns.hacknet.upgradeRam(nodeIndex, 1); break;
        case 'C': this.ns.hacknet.upgradeCore(nodeIndex, 1); break;
        case 'N': this.ns.hacknet.purchaseNode(); break;
      }
      this.ns.print(`Performed Hacknet action: ${bestOption.type} for $${this.ns.formatNumber(bestOption.cost)}`);
      return true;
    }
    return false;
  }

  async upgradeAllToMatchNode(baseIndex) {
    const baseNode = this.ns.hacknet.getNodeStats(baseIndex);
    for (let i = 0; i < this.ns.hacknet.numNodes(); i++) {
      if (i === baseIndex) continue;
      const currNode = this.ns.hacknet.getNodeStats(i);
      
      if (currNode.level < baseNode.level) {
        await this.waitTillCash(this.ns.hacknet.getLevelUpgradeCost(i, baseNode.level - currNode.level));
        this.ns.hacknet.upgradeLevel(i, baseNode.level - currNode.level);
      }
      if (currNode.ram < baseNode.ram) {
        await this.waitTillCash(this.ns.hacknet.getRamUpgradeCost(i, Math.log2(baseNode.ram / currNode.ram)));
        this.ns.hacknet.upgradeRam(i, Math.log2(baseNode.ram / currNode.ram));
      }
      if (currNode.cores < baseNode.cores) {
        await this.waitTillCash(this.ns.hacknet.getCoreUpgradeCost(i, baseNode.cores - currNode.cores));
        this.ns.hacknet.upgradeCore(i, baseNode.cores - currNode.cores);
      }
    }
  }

  async waitTillCash(target) {
    while (this.ns.getServerMoneyAvailable("home") < target) {
      await this.ns.sleep(1000);
    }
  }

  async optimize() {
    if (this.ns.hacknet.numNodes() === 0) {
      await this.waitTillCash(this.ns.hacknet.getPurchaseNodeCost());
      this.ns.hacknet.purchaseNode();
      this.ns.print("Purchased first Hacknet node");
    }

    let optimized = true;
    while (optimized) {
      const weakestIndex = this.findWeakestNode();
      optimized = await this.optimizeNode(weakestIndex);
      await this.upgradeAllToMatchNode(weakestIndex);
    }
  }
}

class ServerManager {
  constructor(ns) {
    this.ns = ns;
  }

  getOptimalServerRam() {
    const maxRam = this.ns.getPurchasedServerMaxRam();
    const playerMoney = this.ns.getServerMoneyAvailable("home");
    let optimalRam = 2;

    while (optimalRam * 2 <= maxRam && this.ns.getPurchasedServerCost(optimalRam * 2) <= playerMoney) {
      optimalRam *= 2;
    }

    return optimalRam;
  }

  async buyAndUpgradeServers() {
    const maxServers = this.ns.getPurchasedServerLimit();
    const currentServers = this.ns.getPurchasedServers();

    // Buy new servers if possible
    while (currentServers.length < maxServers) {
      const ram = this.getOptimalServerRam();
      const cost = this.ns.getPurchasedServerCost(ram);

      if (this.ns.getServerMoneyAvailable("home") >= cost) {
        const serverName = `pserv-${currentServers.length}`;
        await this.waitTillCash(cost);
        this.ns.purchaseServer(serverName, ram);
        this.ns.print(`Purchased new server: ${serverName} with ${ram}GB RAM`);
        currentServers.push(serverName);
      } else {
        break;
      }
    }

    // Upgrade existing servers
    for (const server of currentServers) {
      const currentRam = this.ns.getServerMaxRam(server);
      const optimalRam = this.getOptimalServerRam();

      if (currentRam < optimalRam) {
        const upgradeCost = this.ns.getPurchasedServerUpgradeCost(server, optimalRam);
        if (this.ns.getServerMoneyAvailable("home") >= upgradeCost) {
          this.ns.upgradePurchasedServer(server, optimalRam);
          this.ns.print(`Upgraded server: ${server} to ${optimalRam}GB RAM`);
        }
      }
    }
  }

  async waitTillCash(target) {
    while (this.ns.getServerMoneyAvailable("home") < target) {
      await this.ns.sleep(10000);
    }
  }
}