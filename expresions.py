#!/usr/bin/env python3

def add_operators(digits, target):
    def backtrack(index, prev_operand, current_operand, value, expression):
        if index == len(digits):
            if value == target and current_operand == 0:
                results.append(expression)
            return
        
        # Aktuelle Zahl als String erhalten
        current_num_str = digits[index]
        current_num = int(current_num_str)

        # Aktuelle Zahl erweitern
        new_current_operand = current_operand * 10 + current_num

        # Fortfahren, um die aktuelle Zahl zu bilden (keine führenden Nullen)
        if current_operand > 0:
            backtrack(index + 1, prev_operand, new_current_operand, value, expression)

        # '+' Operator berücksichtigen
        backtrack(index + 1, new_current_operand, 0, value + new_current_operand, expression + '+' + current_num_str)

        # '-' Operator berücksichtigen
        backtrack(index + 1, -new_current_operand, 0, value - new_current_operand, expression + '-' + current_num_str)

        # '*' Operator berücksichtigen
        backtrack(index + 1, prev_operand * new_current_operand, 0, value - prev_operand + (prev_operand * new_current_operand), expression + '*' + current_num_str)

    results = []
    if digits:
        backtrack(1, int(digits[0]), 0, 0, digits[0])
    return results

if __name__ == "__main__":
    # Benutzereingabe für Ziffern und Ziel
    digits = input("Geben Sie die Ziffern ein: ")
    target = int(input("Geben Sie das Ziel ein: "))
    
    result = add_operators(digits, target)
    
    # Ausgabe im gewünschten Format
    print(result)

