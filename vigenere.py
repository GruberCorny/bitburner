#!/usr/bin/env python3

import sys

def vigenere_encrypt(plaintext, keyword):
    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    ciphertext = []
    
    keyword = keyword.upper()
    keyword_repeated = (keyword * ((len(plaintext) // len(keyword)) + 1))[:len(plaintext)]
    
    for p, k in zip(plaintext, keyword_repeated):
        p_index = alphabet.index(p.upper())
        k_index = alphabet.index(k)
        cipher_index = (p_index + k_index) % 26
        ciphertext.append(alphabet[cipher_index])
    
    return ''.join(ciphertext)

# Prüfen, ob genügend Argumente übergeben wurden
if len(sys.argv) != 3:
    print("Verwendung: ./vigenere.py <Klartext> <Schlüsselwort>")
    sys.exit(1)

# Eingaben aus den Kommandozeilenargumenten holen
plaintext = sys.argv[1].upper()
keyword = sys.argv[2].upper()

# Verschlüsselung und Ausgabe des Ergebnisses
result = vigenere_encrypt(plaintext, keyword)
print("Der verschlüsselte Text ist:", result)

