/** @param {NS} ns */
export async function main(ns) {
    const COMMISSION = 100000; // Gebühr pro Transaktion
    let profit = 0;
    let positions = {};
    let previousForecasts = {};
    while((!ns.stock.hasWSEAccount() || !ns.stock.has4SData() || !ns.stock.has4SDataTIXAPI() || !ns.stock.hasTIXAPIAccess())){
      await ns.sleep(10 * 60 * 1000)
    }
    function getAllStocks() {
        const symbols = ns.stock.getSymbols();
        return symbols.map(sym => ({
            symbol: sym,
            price: ns.stock.getPrice(sym),
            maxShares: ns.stock.getMaxShares(sym),
            forecast: ns.stock.getForecast(sym),
            position: ns.stock.getPosition(sym)
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
        const maxInvestment = totalAssets * 0.8;
        const cost = stock.price * sharesToBuy + COMMISSION;
        
        if (cost > maxInvestment) return false;
        if (COMMISSION > 0.01 * (cost - COMMISSION)) return false;
        
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

    function getPortfolioValue(stocks) {
        return stocks.reduce((total, stock) => {
            const [longShares, avgLongPrice, shortShares, avgShortPrice] = stock.position;
            return total + (longShares * stock.price) - (shortShares * stock.price);
        }, 0);
    }

    function initializePositions() {
        const stocks = getAllStocks();
        stocks.forEach(stock => {
            const [longShares, avgLongPrice, shortShares, avgShortPrice] = stock.position;
            if (longShares > 0) {
                positions[stock.symbol] = { shares: longShares, price: avgLongPrice, symbol: stock.symbol };
            }
            // Wir ignorieren Short-Positionen hier, da das ursprüngliche Skript nur mit Long-Positionen arbeitet
        });
        ns.print(`Initialisierte ${Object.keys(positions).length} bestehende Positionen.`);
    }

    // Initialisiere bestehende Positionen beim Start
    initializePositions();

    while (true) {
        const stocks = getAllStocks();
        const totalAssets = getTotalAssets();
        const portfolioValue = getPortfolioValue(stocks);
        
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
        const language = "en"
        ns.clearLog();
        ns.print(`=== Aktienmarkt-Konservativer Trader ===`);
        ns.print(`Verfügbares Kapital: $${Intl.NumberFormat(language, {notation: "compact"}).format(totalAssets)}`);
        ns.print(`Portfoliowert: $${Intl.NumberFormat(language, {notation: "compact"}).format(portfolioValue)}`);
        ns.print(`Gesamter Profit: $${Intl.NumberFormat(language, {notation: "compact"}).format(profit)}`);
        ns.print(`Aktuelle Positionen:`);
        for (const stock of stocks) {
            const [longShares, avgLongPrice, shortShares, avgShortPrice] = stock.position;
            if (longShares > 0 || shortShares > 0) {

                const longValue = longShares * stock.price;
                const shortValue = shortShares * stock.price;
                const longProfit = calculateProfit(avgLongPrice, stock.price, longShares);
                const shortProfit = calculateProfit(stock.price, avgShortPrice, shortShares);
                ns.print(`  ${stock.symbol}:`);
                ns.print(`    Wert: $${Intl.NumberFormat(language, {notation: "compact"}).format(longValue)}, Gewinn: $${Intl.NumberFormat(language, {notation: "compact"}).format(longProfit)}`);
                ns.print(`    Prognose: ${Intl.NumberFormat(language, {notation: "compact"}).format((stock.forecast * 100))}%`);
            }
        }

        // Aktualisiere vorherige Prognosen
        stocks.forEach(stock => {
            previousForecasts[stock.symbol] = stock.forecast;
        });

        await ns.sleep(200); // Aktualisiere alle 6 Sekunden
    }
}
