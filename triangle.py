#!/usr/bin/env python3
import ast

def minimum_total(triangle):
    # Beginne von der vorletzten Zeile des Dreiecks und arbeite nach oben
    for row in range(len(triangle) - 2, -1, -1):
        for col in range(len(triangle[row])):
            # Wähle das Minimum aus den zwei möglichen unteren Nachbarn und addiere es zur aktuellen Position
            triangle[row][col] += min(triangle[row + 1][col], triangle[row + 1][col + 1])
    return triangle[0][0]  # Die minimale Summe befindet sich dann an der Spitze des Dreiecks

# Funktion zum Einlesen des Dreiecks aus einer Datei
def read_triangle_from_file(filename):
    with open(filename, 'r') as file:
        triangle_input = file.read()

    # Umwandlung des Strings in eine Liste
    triangle = ast.literal_eval(triangle_input)
    
    return triangle

# Datei mit dem Dreieck einlesen
filename = "triangle.txt"
triangle = read_triangle_from_file(filename)

# Ausgabe
if triangle:
    print("Die minimale Pfadsumme ist:", minimum_total(triangle))
else:
    print("Kein Dreieck eingegeben.")

