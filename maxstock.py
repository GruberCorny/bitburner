#!/usr/bin/env python3

def max_profit(prices):
    profit = 0
    # Iteriere über das Array der Preise
    for i in range(1, len(prices)):
        # Wenn der Preis am Tag i höher ist als am Tag i-1, dann machen wir Gewinn
        if prices[i] > prices[i - 1]:
            profit += prices[i] - prices[i - 1]
    return profit

# Funktion, um die Preise von der Eingabe zu lesen
def read_prices():
    print("Gib die Aktienpreise im folgenden Format ein:")
    print("z.B.: 38,78,187,26,127,74,137,81,84,73")
    
    # Eingabe der Aktienpreise
    prices_input = input("Preise eingeben: ")

    # Umwandlung des Eingabestrings in eine Liste von Ganzzahlen
    prices = list(map(int, prices_input.split(',')))
    
    return prices

# Eingabe der Aktienpreise
prices = read_prices()

# Ausgabe des maximalen Profits
if prices:
    print("Der maximale mögliche Profit ist:", max_profit(prices))
else:
    print("Keine Preise eingegeben.")

