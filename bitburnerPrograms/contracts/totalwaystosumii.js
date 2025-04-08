

export async function main(ns) {
  // Define the problem parameters
  const target = ns.args[0];
  const numbers = ns.args[1];

  // Calculate and print the result
  const result = countWays(target, numbers);
  ns.tprint(`The number ${target} can be written as a sum of integers from the given set in ${result} distinct ways.`);

}

function countWays(target, numbers) {
  let ways = 0;
  let targets = [];
  for (let num of numbers) {
    
    if(target)
    if(!target.has(target - num)){
      target.add(target - num);
    }
  }
  return ways;
}