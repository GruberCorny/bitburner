/** @param {NS} ns */
export async function main(ns) {
    // The input string to compress
    const input = ns.args[0];

    // Function to perform RLE compression
    function rleCompress(str) {
        let compressed = "";
        let count = 1;
        let currentChar = str[0];

        for (let i = 1; i <= str.length; i++) {
            if (i < str.length && str[i] === currentChar) {
                count++;
            } else {
                while (count > 0) {
                    let runLength = Math.min(count, 9);
                    compressed += runLength + currentChar;
                    count -= runLength;
                }
                currentChar = str[i];
                count = 1;
            }
        }

        return compressed;
    }

    // Compress the input string
    const compressedOutput = rleCompress(input);

    // Log the results
    ns.tprint("Original string: " + input);
    ns.tprint("Compressed string: " + compressedOutput);
    ns.tprint("Original length: " + input.length);
    ns.tprint("Compressed length: " + compressedOutput.length);
}