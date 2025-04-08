/** @param {NS} ns */
export async function main(ns) {
    const HACKING_TASKS = ["Ransomware", "Phishing", "Identity Theft", "DDoS Attacks", "Plant Virus"];
    const COMBAT_TASKS = ["Mug People", "Strongarm Civilians", "Run a Con", "Armed Robbery", "Traffick Illegal Arms"];
    const TRAINING_TASKS = ["Train Combat", "Train Hacking", "Train Charisma"];
    const WANTED_REDUCTION_TASK = "Vigilante Justice";
    const WANTED_LEVEL_THRESHOLD = 2;
    const WANTED_PENALTY_MULTIPLIER = 0.95; // Straffaktor für hohes Wanted Level

    function isHackingGang() {
        return ns.gang.getGangInformation().isHacking;
    }

    function getMemberNames() {
        return ns.gang.getMemberNames();
    }

    function calculateTaskEffectiveness(member, task) {
        const info = ns.gang.getMemberInformation(member);
        const stats = ns.gang.getTaskStats(task);
        
        let effectiveness = 0;
        if (isHackingGang()) {
            effectiveness = info.hack * stats.hackWeight +
                            info.cha * stats.chaWeight +
                            info.int * stats.intWeight;
        } else {
            effectiveness = info.str * stats.strWeight +
                            info.def * stats.defWeight +
                            info.dex * stats.dexWeight +
                            info.agi * stats.agiWeight;
        }
        
        effectiveness *= (info.earnedRespect + 1) / 10000;
        return effectiveness;
    }

    function calculateWantedPenalty(wantedLevel, wantedLevelGain) {
        const futureWantedLevel = wantedLevel + wantedLevelGain;
        return Math.pow(WANTED_PENALTY_MULTIPLIER, Math.max(0, futureWantedLevel - WANTED_LEVEL_THRESHOLD));
    }

    function calculateWantedLevelReductionCost(currentWantedLevel, wantedLevelGain) {
        const futureWantedLevel = Math.max(0, currentWantedLevel + wantedLevelGain);
        const reductionNeeded = Math.max(0, futureWantedLevel - WANTED_LEVEL_THRESHOLD);
        // Annahme: Kosten steigen quadratisch mit dem zu reduzierenden Wanted Level
        return Math.pow(reductionNeeded, 2) * 1e6; // 1e6 ist ein Beispielwert, anpassen nach Bedarf
    }

    function assignOptimalTask(member) {
        const info = ns.gang.getMemberInformation(member);
        const gangInfo = ns.gang.getGangInformation();
        
        if (gangInfo.wantedLevel > WANTED_LEVEL_THRESHOLD * 1.5) {
            ns.gang.setMemberTask(member, WANTED_REDUCTION_TASK);
            return;
        }

        const tasks = isHackingGang() ? HACKING_TASKS : COMBAT_TASKS;
        let bestTask = tasks[0];
        let bestGain = 0;

        for (const task of tasks) {
            const stats = ns.gang.getTaskStats(task);
            const effectiveness = calculateTaskEffectiveness(member, task);
            const moneyGain = stats.baseMoney * effectiveness;
            const respectGain = stats.baseRespect * effectiveness;
            
            const wantedLevelGain = stats.baseWanted * effectiveness;
            const wantedPenalty = calculateWantedPenalty(gangInfo.wantedLevel, wantedLevelGain);
            const wantedReductionCost = calculateWantedLevelReductionCost(gangInfo.wantedLevel, wantedLevelGain);
            
            const totalGain = (moneyGain + respectGain * 100) * wantedPenalty - wantedReductionCost;

            if (totalGain > bestGain) {
                bestGain = totalGain;
                bestTask = task;
            }
        }

        // Check if training is needed
        const primarySkill = isHackingGang() ? info.hack : Math.max(info.str, info.def, info.dex, info.agi);
        if (primarySkill < 100) {
            bestTask = isHackingGang() ? "Train Hacking" : "Train Combat";
        }

        ns.gang.setMemberTask(member, bestTask);
    }

    function recruitNewMember() {
        if (ns.gang.canRecruitMember()) {
            const name = "Gangster" + (getMemberNames().length + 1);
            ns.gang.recruitMember(name);
            ns.print(`Neues Gangmitglied rekrutiert: ${name}`);
        }
    }

    function upgradeEquipment() {
        const members = getMemberNames();
        const equipments = ns.gang.getEquipmentNames();

        for (const member of members) {
            for (const equip of equipments) {
                if (ns.gang.getEquipmentCost(equip) <= ns.getServerMoneyAvailable("home")) {
                    ns.gang.purchaseEquipment(member, equip);
                }
            }
        }
    }

    function manageWantedLevel() {
        const gangInfo = ns.gang.getGangInformation();
        if (gangInfo.wantedLevel > WANTED_LEVEL_THRESHOLD * 1.5) {
            ns.print(`Wanted Level zu hoch (${gangInfo.wantedLevel.toFixed(2)}). Reduziere...`);
            return true;
        }
        return false;
    }

    while (true) {
        await ns.sleep(20 * 1000);
        recruitNewMember();
        upgradeEquipment();

        const members = getMemberNames();
        const reduceWantedLevel = manageWantedLevel();

        for (const member of members) {
            if (reduceWantedLevel) {
                ns.gang.setMemberTask(member, WANTED_REDUCTION_TASK);
            } else {
                assignOptimalTask(member);
            }
        }

        const gangInfo = ns.gang.getGangInformation();
        ns.print(`Gang-Typ: ${gangInfo.isHacking ? 'Hacking' : 'Kampf'}`);
        ns.print(`Mitglieder: ${members.length}`);
        ns.print(`Respekt: ${gangInfo.respect.toFixed(2)}`);
        ns.print(`Wanted Level: ${gangInfo.wantedLevel.toFixed(2)}`);
        ns.print(`Geld/Sek: $${gangInfo.moneyGainRate.toFixed(2)}`);
    }
}