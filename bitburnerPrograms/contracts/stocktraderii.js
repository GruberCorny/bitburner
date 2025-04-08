/** @param {NS} ns */
export async function main(ns) {
    // Check if input is provided
    if (ns.args.length === 0) {
        ns.tprint("Please provide stock prices as a comma-separated list. Example: run stock-trader-ii.js 13,87,110,43,136,4,158,123,118,32,158,98");
        return;
    }

    // Split the input string and convert to numbers
    const prices = ns.args[0].split(',').map(num => parseInt(num.trim()));

    // Validate input
    if (prices.some(isNaN)) {
        ns.tprint("Invalid input. All values must be numbers.");
        return;
    }

    let maxProfit = 0;
    
    for (let i = 1; i < prices.length; i++) {
        if (prices[i] > prices[i - 1]) {
            maxProfit += prices[i] - prices[i - 1];
        }
    }
    
    ns.tprint(`Maximum profit: ${maxProfit}`);
}