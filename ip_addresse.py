#!/usr/bin/env python3

def is_valid(segment):
    # Überprüft, ob das Segment eine gültige IP-Adresse ist
    if len(segment) > 1 and segment[0] == '0':  # Keine führenden Nullen
        return False
    if 0 <= int(segment) <= 255:  # Das Segment muss im Bereich 0-255 liegen
        return True
    return False

def backtrack(start, path, result):
    # Wenn 4 Segmente und alle Zeichen verwendet wurden, füge zur Ergebnisliste hinzu
    if len(path) == 4:
        if start == len(s):
            result.append(".".join(path))
        return

    # Segmente der Länge 1, 2 oder 3 testen
    for length in range(1, 4):
        if start + length <= len(s):
            segment = s[start:start + length]
            if is_valid(segment):
                backtrack(start + length, path + [segment], result)

# Eingabe vom Benutzer entgegennehmen
s = input("Gib die Zeichenfolge für die IP-Adresskombination ein: ")

# Ergebnisliste initialisieren
result = []
backtrack(0, [], result)

# Ergebnis zurückgeben
print(result)

