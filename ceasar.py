#!/usr/bin/env python3

def caesar_cipher(text, shift):
    # Funktion zum Verschlüsseln des Textes mit dem Caesar Cipher
    def shift_char(char, shift):
        if char.isalpha():  # nur Buchstaben verschieben
            shifted = ord(char) - shift
            if shifted < ord('A'):
                shifted += 26  # bei Unterlauf auf das Ende des Alphabets verschieben
            return chr(shifted)
        return char  # Leerzeichen und andere Zeichen unverändert lassen

    # Den Text durchgehen und jeden Buchstaben verschieben
    ciphertext = ''.join(shift_char(char, shift) if char.isalpha() else char for char in text.upper())
    return ciphertext

# Eingabe
plaintext = input("Gib den zu verschlüsselnden Text ein: ")
shift_value = int(input("Gib die Linksverschiebung ein (ganzzahliger Wert): "))

# Ausgabe
print("Verschlüsselter Text:", caesar_cipher(plaintext, shift_value))

