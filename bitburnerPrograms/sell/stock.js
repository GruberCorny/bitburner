/** @param {NS} ns */
export async function main(ns) {
    const stocks = ns.stock.getSymbols();
    
    for (const symbol of stocks) {
        const position = ns.stock.getPosition(symbol);
        const longShares = position[0];
        const shortShares = position[2];
        
        if (longShares > 0) {
            ns.stock.sellStock(symbol, longShares);
            ns.print(`Verkauft ${longShares} Long-Aktien von ${symbol}`);
        }
        
        if (shortShares > 0) {
            ns.stock.sellShort(symbol, shortShares);
            ns.print(`Verkauft ${shortShares} Short-Aktien von ${symbol}`);
        }
    }
    
    ns.print("Alle Aktien wurden verkauft.");
}