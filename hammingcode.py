#!/usr/bin/env python3

def decimal_to_binary(decimal):
    return bin(decimal)[2:]  # Remove '0b' prefix

def calculate_parity(bits, start, step):
    return sum(int(bits[i]) for i in range(start, len(bits), step)) % 2

def encode_extended_hamming(decimal):
    # Convert to binary
    binary = decimal_to_binary(decimal)
    
    # Calculate the number of parity bits needed
    m = len(binary)
    r = 0
    while (1 << r) < m + r + 1:
        r += 1
    
    # Initialize the encoded message with placeholders
    encoded = ['0'] * (m + r)
    
    # Place data bits
    j = 0
    for i in range(1, len(encoded)):
        if i & (i - 1) != 0:  # Not a power of 2
            encoded[i] = binary[j]
            j += 1
    
    # Calculate and set parity bits (except for position 0)
    for i in range(r - 1):
        pos = 1 << i
        parity = calculate_parity(encoded, pos, pos)
        encoded[pos] = str(parity)
    
    # Calculate and set the overall parity bit at position 0
    encoded[0] = str(sum(int(bit) for bit in encoded[1:]) % 2)
    
    return ''.join(encoded)

# Test the function
decimal = 29
result = encode_extended_hamming(decimal)
print(f"Input: {decimal}")
print(f"Extended Hamming Code: {result}")
