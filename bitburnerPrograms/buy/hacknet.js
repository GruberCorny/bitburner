function gainFromLevelUpgrade(X, Y, Z) {
  return ((1 * 1.6) * Math.pow(1.035, Y - 1) * ((Z + 5) / 6));
}
function gainFromRamUpgrade(X, Y, Z) {
  return ((X * 1.6) * (Math.pow(1.035, (2 * Y) - 1) - Math.pow(1.035, Y - 1)) * ((Z + 5) / 6));
}
function gainFromCoreUpgrade(X, Y, Z) {
  return ((X * 1.6) * Math.pow(1.035, Y - 1) * (1 / 6));
}
function log2(num) {
  return Math.log(num) / Math.log(2);
}

async function upgradeAllToMatchNode(ns, baseIndex) {
  let baseNode = ns.hacknet.getNodeStats(baseIndex);
  for (let i = 0; i < ns.hacknet.numNodes(); i++) {
    let currNode = ns.hacknet.getNodeStats(i);
    if (currNode.level < baseNode.level && ns.getServerMoneyAvailable("home") / 4 >= ns.hacknet.getLevelUpgradeCost(i, baseNode.level - currNode.level)) {
      ns.hacknet.upgradeLevel(i, 1);
    }
    if (currNode.ram < baseNode.ram && ns.getServerMoneyAvailable("home") / 4 >= ns.hacknet.getRamUpgradeCost(i, log2(baseNode.ram / currNode.ram))) {
      ns.hacknet.upgradeRam(i, 1);
    }
    if (currNode.cores < baseNode.cores && ns.getServerMoneyAvailable("home") / 4 >= ns.hacknet.getCoreUpgradeCost(i, baseNode.cores - currNode.cores)) {
      ns.hacknet.upgradeCore(i, 1);
    }
  }
}

let breakevenTime = 1 * 60 * 60 * 1000;//Time in seconds

function minHashes10Prozent(ns) {
  let hashesOpen = Math.floor(ns.hacknet.numHashes() - ns.hacknet.hashCapacity() * 0.1);

  let hashUpgrade = "Sell for Money";
  let hashTarget = "";
  if (hashesOpen < ns.hacknet.hashCost(hashUpgrade)) {
    return 0;
  }
  let numSell = hashesOpen / ns.hacknet.hashCost(hashUpgrade);
  ns.hacknet.spendHashes(hashUpgrade, hashTarget, numSell);
  return 0;
}

export async function main(ns) {
  while (true) {
    await ns.sleep(1 * 1000);
    while (ns.hacknet.numNodes() === 0) {
      ns.hacknet.purchaseNode();
      await ns.sleep(10 * 1000);
    }
    if (ns.hacknet.numHashes() > ns.hacknet.hashCapacity() * 0.1 && ns.hacknet.hashCapacity() != 0) {
      minHashes10Prozent(ns);
    }
    let weakestIndex = 0;
    let weakestNode = ns.hacknet.getNodeStats(0);
    for (let i = 1; i < ns.hacknet.numNodes(); i++) {
      if (ns.hacknet.getNodeStats(i).production < weakestNode.production) {
        weakestNode = ns.hacknet.getNodeStats(i);
        weakestIndex = i;
      }
    }
    ns.print(weakestIndex);

    let bestBEven = 0;
    let gainMul = 2;
    try {
      gainMul = ns.getHacknetMultipliers().production * ns.getBitNodeMultipliers().HacknetNodeMoney;
    } catch { }
    while (bestBEven < breakevenTime) {
      weakestNode = ns.hacknet.getNodeStats(weakestIndex);
      let X = weakestNode.level;
      let Y = weakestNode.ram;
      let Z = weakestNode.cores;
      let cost, gain;
      let choice = "X";
      bestBEven = breakevenTime;

      //Try upgrading Level
      cost = ns.hacknet.getLevelUpgradeCost(weakestIndex, 1);
      gain = gainMul * gainFromLevelUpgrade(X, Y, Z);
      //ns.print(cost/gain);
      if ((cost / gain) <= bestBEven) {
        bestBEven = cost / gain;
        choice = "L";
      }

      //Try upgrading RAM
      cost = ns.hacknet.getRamUpgradeCost(weakestIndex, 1);
      gain = gainMul * gainFromRamUpgrade(X, Y, Z);
      //ns.print(cost/gain);
      if ((cost / gain) < bestBEven) {
        bestBEven = cost / gain;
        choice = "R";
      }

      //Try upgrading Cores
      cost = ns.hacknet.getCoreUpgradeCost(weakestIndex, 1);
      gain = gainMul * gainFromCoreUpgrade(X, Y, Z);
      //ns.print(cost/gain);
      if ((cost / gain) < bestBEven) {
        bestBEven = cost / gain;
        choice = "C";
      }

      //Try buying new Node
      cost = ns.hacknet.getPurchaseNodeCost();
      gain = weakestNode.production;
      ns.print(cost / gain);
      if ((cost / gain) < bestBEven) {
        bestBEven = cost / gain;
        choice = "N";
      }

      switch (choice) {
        case "X"://Do nothing
          break;
        case "L":
          if (ns.getServerMoneyAvailable("home") / 4 >= ns.hacknet.getLevelUpgradeCost(weakestIndex, 1)) {
            ns.hacknet.upgradeLevel(weakestIndex, 1);
          }
          break;
        case "R":
          if (ns.getServerMoneyAvailable("home") / 4 >= ns.hacknet.getRamUpgradeCost(weakestIndex, 1)) {
            ns.hacknet.upgradeRam(weakestIndex, 1);
          }
          break;
        case "C":
          if (ns.getServerMoneyAvailable("home") / 4 >= ns.hacknet.getCoreUpgradeCost(weakestIndex, 1)) {
            ns.hacknet.upgradeCore(weakestIndex, 1);
          }
          break;
        case "N":
          if (ns.getServerMoneyAvailable("home") / 4 >= ns.hacknet.getPurchaseNodeCost()) {
            ns.hacknet.purchaseNode();
            break;
          }
      }
      await upgradeAllToMatchNode(ns, weakestIndex);
      await ns.sleep(1 * 1000);
    }
  }
}