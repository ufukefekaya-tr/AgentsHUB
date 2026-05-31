
def check_balance(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    lines = content.split('\n')
    for i, line in enumerate(lines):
        for char in line:
            if char in '{[(':
                stack.append((char, i + 1))
            elif char in '}])':
                if not stack:
                    print(f"Extra closing '{char}' at line {i+1}")
                    continue
                last_char, last_line = stack.pop()
                if (char == '}' and last_char != '{') or \
                   (char == ']' and last_char != '[') or \
                   (char == ')' and last_char != '('):
                    print(f"Mismatched '{char}' at line {i+1} (opened '{last_char}' at line {last_line})")
    
    for char, line in stack:
        print(f"Unclosed '{char}' opened at line {line}")

check_balance('c:/OpenAGENT/dashboard/src/App.jsx')
