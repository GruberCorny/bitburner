/** @param {NS} ns */
export async function main(ns) {
    const input = ns.args[0] || "()))a)a)";

    function isValid(str) {
        let count = 0;
        for (let char of str) {
            if (char === '(') count++;
            if (char === ')') count--;
            if (count < 0) return false;
        }
        return count === 0;
    }

    function sanitizeParentheses(s) {
        if (s.length === 0) return [""];
        let visited = new Set();
        let queue = [s];
        let result = [];
        let found = false;

        while (queue.length > 0 && !found) {
            let levelSize = queue.length;
            for (let i = 0; i < levelSize; i++) {
                let curr = queue.shift();
                if (isValid(curr)) {
                    result.push(curr);
                    found = true;
                }
                if (found) continue;

                for (let j = 0; j < curr.length; j++) {
                    if (curr[j] !== '(' && curr[j] !== ')') continue;
                    let next = curr.slice(0, j) + curr.slice(j + 1);
                    if (!visited.has(next)) {
                        visited.add(next);
                        queue.push(next);
                    }
                }
            }
        }

        return result.length > 0 ? result : [""];
    }

    const result = sanitizeParentheses(input);
    ns.tprint(`Input: ${input}`);
    ns.tprint(`Result: ${JSON.stringify(result)}`);
}

