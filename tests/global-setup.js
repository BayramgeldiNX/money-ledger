// Dates in the tests are local-time; pin the time zone so the numbers are the same on every computer.
export default function setup() { process.env.TZ = "Asia/Shanghai"; }
