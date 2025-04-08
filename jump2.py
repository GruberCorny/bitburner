#!/usr/bin/env python3

def min_jumps(arr):
    if len(arr) == 0 or arr[0] == 0:
        return 0  # Wenn wir am Anfang nicht springen können, ist es unmöglich, das Ende zu erreichen

    jumps = 0  # Anzahl der benötigten Sprünge
    current_end = 0  # Das weiteste Ziel mit der aktuellen Anzahl an Sprüngen
    farthest = 0  # Das weiteste Ziel, das wir mit dem aktuellen Sprung erreichen können

    for i in range(len(arr) - 1):
        farthest = max(farthest, i + arr[i])  # Aktualisiere das weiteste Ziel
        if i == current_end:  # Wenn wir das Ende des aktuellen Sprungs erreichen
            jumps += 1
            current_end = farthest  # Setze das neue Ziel
            if current_end >= len(arr) - 1:  # Wenn wir das Ende des Arrays erreichen können
                break

    return jumps if current_end >= len(arr) - 1 else 0  # Überprüfe, ob wir das Ende erreichen

# Eingabe
input_array = input("Gib das Array mit Kommas getrennt ein: ")
arr = list(map(int, input_array.split(',')))

# Ausgabe
result = min_jumps(arr)
if result == 0:
    print("Es ist nicht möglich, das Ende des Arrays zu erreichen.")
else:
    print(f"Minimale Anzahl von Sprüngen: {result}")

