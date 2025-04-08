/** @param {NS} ns */
export async function main(ns) {
    const COMMISSION = 100000; // Gebühr pro Transaktion
    let profit = 0;
    let positions = {};
    let previousForecasts = {};

    function getAllStocks() {
        const symbols = ns.stock.getSymbols();
        return symbols.map(sym => ({
            symbol: sym,
            price: ns.stock.getPrice(sym),
            maxShares: ns.stock.getMaxShares(sym),
            forecast: ns.stock.getForecast(sym)
        }));
    }

    function calculateProfit(buyPrice, sellPrice, shares) {
        return (sellPrice - buyPrice) * shares - 2 * COMMISSION;
    }

    function getTotalAssets() {
        return ns.getServerMoneyAvailable("home");
    }

    function buy(stock, sharesToBuy) {
        const totalAssets = getTotalAssets();
        const maxInvestment = totalAssets / 3;
        const cost = stock.price * sharesToBuy + COMMISSION;
        
        if (cost > maxInvestment) return false;
        if (COMMISSION > 0.01 * (cost - COMMISSION)) return false; // Prüfe, ob Gebühren < 1% des Aktienkaufpreises sind
        
        ns.stock.buyStock(stock.symbol, sharesToBuy);
        profit -= cost;
        positions[stock.symbol] = { shares: sharesToBuy, price: stock.price, symbol: stock.symbol };
        return true;
    }

    function sell(stock, sharesToSell) {
        if (!positions[stock.symbol]) return false;
        
        ns.stock.sellStock(stock.symbol, sharesToSell);
        const revenue = stock.price * sharesToSell - COMMISSION;
        profit += revenue;
        delete positions[stock.symbol];
        return true;
    }

    function hasImprovedForecast(symbol, currentForecast) {
        const previousForecast = previousForecasts[symbol];
        return previousForecast !== undefined && 
               previousForecast < 0.5 && 
               currentForecast >= 0.5;
    }


    while (true) {
        const stocks = getAllStocks();
        const totalAssets = getTotalAssets();
        
        // Verkaufen
        for (const stock of stocks) {
            if (positions[stock.symbol] && stock.forecast < 0.5) {
                const profit = calculateProfit(positions[stock.symbol].price, stock.price, positions[stock.symbol].shares);
                if (sell(stock, positions[stock.symbol].shares)) {
                    ns.print(`Verkauft ${stock.symbol}: ${profit > 0 ? 'Gewinn' : 'Verlust'} $${Math.abs(profit).toFixed(2)}`);
                }
            }
        }
        
        // Kaufen
        stocks
            .filter(s => hasImprovedForecast(s.symbol, s.forecast) && !positions[s.symbol])
            .forEach(stock => {
                const maxInvestment = totalAssets / 3;
                const affordableShares = Math.floor((maxInvestment- COMMISSION) / stock.price);
                const sharesToBuy = Math.min(affordableShares, stock.maxShares);
                if (sharesToBuy > 0 && buy(stock, sharesToBuy)) {
                    ns.print(`Gekauft ${stock.symbol}: ${sharesToBuy} Aktien für $${(stock.price * sharesToBuy).toFixed(2)}`);
                }
            });

        // Statusbericht
        ns.clearLog();
        ns.print(`=== Aktienmarkt-Konservativer Trader ===`);
        ns.print(`Einsatz Kapital: $${totalAssets.toFixed(2)}`);
        ns.print(`Profit made: $${profit.toFixed(2)}`);
        ns.print(`Aktuelle Positionen:`);
        for (const [symbol, position] of Object.entries(positions)) {
            const currentPrice = ns.stock.getPrice(symbol);
            const profit = calculateProfit(position.price, currentPrice, position.shares);
            const positionValue = currentPrice * position.shares;
            ns.print(`  ${symbol}: ${position.shares} Aktien, Wert: $${positionValue.toFixed(2)}, Gewinn: $${profit.toFixed(2)}`);
        }

        // Aktualisiere vorherige Prognosen
        stocks.forEach(stock => {
            previousForecasts[stock.symbol] = stock.forecast;
        });

        await ns.sleep(500); // Aktualisiere alle 6 Sekunden
    }
}